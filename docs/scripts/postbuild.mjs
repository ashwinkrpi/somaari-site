// Runs after `astro build` and rewrites dist/ so the site works under the strict somaari CSP:
//  1. Moves every inline <script> into a same-origin file at the same spot. A classic script stays a
//     blocking classic script and a module stays a module, so timing doesn't change. Files are named
//     by content hash, so a script shared by every page is one cached file.
//  2. Moves every style="" attribute (Starlight's icon sizes, TOC depth, search dialog) into one
//     generated stylesheet, keyed by data-sa="<hash>". The rules are unlayered and Starlight's CSS is
//     in a cascade layer, so they win over it just as the attribute did; JS that sets .style still wins.
//  3. Moves data: images in CSS (Starlight's and Pagefind's icons) into same-origin .svg/.png files,
//     because img-src is 'self' only.
//  4. Renames Starlight's [data-theme=light|dark] (CSS and the <html> attribute) to data-sl-theme,
//     because somaari's theme.js owns data-theme. public/sl-theme-bridge.js sets data-sl-theme.
// Fails (exit 1) if an inline script or style, a style="" attribute or an old selector is left.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const DIST = 'dist';
const OUT = '_astro/inline';
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
const OLD_SELECTOR = /\[data-theme=(['"]?)(light|dark)\1\]/g;

async function* walk(dir) {
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) yield* walk(p);
		else yield p;
	}
}

const DATA_MIME = { 'image/svg+xml': '.svg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
const images = new Map(); // file name -> Buffer

// Replaces each url(data:image/...) in a stylesheet with a file under /_astro/inline/. Reads the
// url() by hand because quoted SVG data often contains the other quote and parentheses.
function liftDataImages(css) {
	let out = '';
	let i = 0;
	for (;;) {
		const at = css.indexOf('url(', i);
		if (at < 0) return out + css.slice(i);
		let j = at + 4;
		while (css[j] === ' ') j++;
		const q = css[j] === '"' || css[j] === "'" ? css[j] : null;
		const start = q ? j + 1 : j;
		const end = css.indexOf(q || ')', start);
		const close = q ? css.indexOf(')', end) : end;
		const value = css.slice(start, end);
		const m = /^data:(image\/[\w+.-]+)(;base64)?,(.*)$/s.exec(value);
		if (!m || !DATA_MIME[m[1]] || end < 0 || close < 0) {
			out += css.slice(i, at + 4);
			i = at + 4;
			continue;
		}
		const bytes = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
		const name = 'img-' + createHash('sha256').update(bytes).digest('hex').slice(0, 12) + DATA_MIME[m[1]];
		images.set(name, bytes);
		out += css.slice(i, at) + `url("/${OUT}/${name}")`;
		i = close + 1;
	}
}

const renameTheme = (s) =>
	s
		.replace(OLD_SELECTOR, '[data-sl-theme=$2]')
		.replace(/<html([^>]*?) data-theme="(light|dark)"/, '<html$1 data-sl-theme="$2"');

await mkdir(join(DIST, OUT), { recursive: true });
const scripts = new Map(); // file name -> body
const attrStyles = new Map(); // hash -> declarations
const ATTR_CSS = `/${OUT}/attrs.css`;
const problems = [];
let pages = 0;

for await (const file of walk(DIST)) {
	const ext = extname(file);
	if (ext === '.css' || (ext === '.js' && !file.includes(OUT))) {
		const src = await readFile(file, 'utf8');
		let out = src.replace(OLD_SELECTOR, '[data-sl-theme=$2]');
		if (ext === '.css') {
			out = liftDataImages(out);
			if (out.includes('data:image')) problems.push(`${file}: data: image left`);
		}
		if (out !== src) await writeFile(file, out);
		continue;
	}
	if (ext !== '.html') continue;
	pages++;
	let html = await readFile(file, 'utf8');
	html = html.replace(INLINE_SCRIPT, (tag, attrs, body) => {
		if (/type="application\/(ld\+)?json"/.test(attrs)) return tag; // data, not script
		const name = createHash('sha256').update(body).digest('hex').slice(0, 12) + '.js';
		scripts.set(name, renameTheme(body));
		return `<script${/type="module"/.test(attrs) ? ' type="module"' : ''} src="/${OUT}/${name}"></script>`;
	});
	html = html.replace(/(<[a-zA-Z][^>]*?)\sstyle="([^"]*)"/g, (_, before, decl) => {
		const h = createHash('sha256').update(decl).digest('hex').slice(0, 10);
		attrStyles.set(h, decl.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
		return `${before} data-sa="${h}"`;
	});
	if (html.includes('data-sa="')) html = html.replace('</head>', `<link rel="stylesheet" href="${ATTR_CSS}"></head>`);
	html = renameTheme(html);
	for (const m of html.matchAll(INLINE_SCRIPT)) {
		if (!/application\/(ld\+)?json/.test(m[1])) problems.push(`${file}: inline <script> left`);
	}
	if (/<style[\s>]/.test(html)) problems.push(`${file}: inline <style>`);
	if (/\sstyle="/.test(html)) problems.push(`${file}: style="" attribute`);
	if (OLD_SELECTOR.test(html)) problems.push(`${file}: [data-theme=light|dark] left`);
	OLD_SELECTOR.lastIndex = 0;
	await writeFile(file, html);
}

await writeFile(
	join(DIST, ATTR_CSS),
	[...attrStyles].map(([h, decl]) => `[data-sa="${h}"]{${decl}}`).join('\n') + '\n',
);
for (const [name, bytes] of images) await writeFile(join(DIST, OUT, name), bytes);
for (const [name, body] of scripts) await writeFile(join(DIST, OUT, name), body);
console.log(`postbuild: ${pages} pages, ${scripts.size} inline scripts and ${attrStyles.size} style attributes and ${images.size} data: images moved to /${OUT}/`);
if (problems.length) {
	console.error(problems.slice(0, 20).join('\n'));
	console.error(`postbuild: ${problems.length} problem(s)`);
	process.exit(1);
}
