// `npm run check`, after a build: checks dist/ and exits 1 on any problem.
//  - Every href="#x" points at an id on the same page, and every href="/<repo>/#x" at an id on that
//    guide page, so links written for GitHub (#-installation, #ai) keep working.
//  - dist/_headers has a Content-Security-Policy without 'unsafe-inline' in script-src.
//  - Everything a page loads (src, srcset, <link href>, CSS url()) is same-origin. Links (<a href>)
//    may go elsewhere, as the guides' links do, but only over https (or mailto:).
//  - No "self-host" wording in the text files of dist/, except theme/: those are somaari-common's
//    files, published unchanged (themes.css has the phrase in a comment), and are checked there.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://docs.somaari.in';
const BANNED = /self[- ]?host/i;
const TEXT = /\.(html|js|mjs|css|svg|xml|txt|json|webmanifest)$|_headers$|_redirects$/;
const problems = [];

async function* walk(dir) {
	for (const e of await readdir(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) yield* walk(p);
		else yield p;
	}
}

const decode = (s) =>
	s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const frag = (s) => {
	try {
		return decodeURIComponent(decode(s));
	} catch {
		return decode(s);
	}
};

const pages = new Map(); // "/path/" -> { file, html, ids }
for await (const file of walk(DIST)) {
	if (!file.endsWith('.html')) continue;
	const html = await readFile(file, 'utf8');
	const url = '/' + file.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '/');
	pages.set(url, { file, html, ids: new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => decode(m[1]))) });
}
if (!pages.size) problems.push('dist/ has no pages: run npm run build first');

for (const [url, { file, html, ids }] of pages) {
	for (const [, href] of html.matchAll(/\shref="([^"]*)"/g)) {
		const m = href.match(/^(\/[^#?"]*)?#(.+)$/);
		if (!m) continue;
		const target = m[1] ?? url;
		const page = m[1] ? pages.get(target.endsWith('/') ? target : target + '/') : { ids };
		if (!page) {
			if (m[1]) problems.push(`${file}: link to a missing page ${href}`);
			continue;
		}
		if (!page.ids.has(frag(m[2]))) problems.push(`${file}: link to a missing heading ${href}`);
	}
}

// CSP
let headers = '';
try {
	headers = await readFile(join(DIST, '_headers'), 'utf8');
} catch {
	problems.push('dist/_headers is missing');
}
const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/im)?.[1];
if (headers && !csp) problems.push('dist/_headers has no Content-Security-Policy');
const scriptSrc = csp?.match(/(?:^|;)\s*script-src([^;]*)/)?.[1];
if (csp && scriptSrc === undefined) problems.push('the CSP has no script-src');
if (scriptSrc?.includes("'unsafe-inline'")) problems.push("the CSP allows 'unsafe-inline' in script-src");

// What pages load, and where links go
const sameOrigin = (url) => {
	const u = decode(url).trim();
	if (!u || u.startsWith('#')) return true;
	if (u.startsWith('//')) return false;
	if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return true;
	return u === SITE || u.startsWith(SITE + '/');
};
for (const [, { file, html }] of pages) {
	const loads = [
		...[...html.matchAll(/\ssrc="([^"]*)"/g)].map((m) => m[1]),
		...[...html.matchAll(/\ssrcset="([^"]*)"/g)].flatMap((m) => m[1].split(',').map((c) => c.trim().split(/\s+/)[0])),
		...[...html.matchAll(/<link\b[^>]*\shref="([^"]*)"/g)]
			.filter((m) => !/\srel="(canonical|alternate|sitemap)"/.test(m[0]))
			.map((m) => m[1]),
	];
	for (const url of loads) if (!sameOrigin(url)) problems.push(`${file}: loads from another origin: ${url}`);
	for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
		const u = decode(href);
		if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !/^(https|mailto):/i.test(u)) problems.push(`${file}: link with ${u.split(':')[0]}: ${u}`);
	}
}

// Text files: CSS url()s and self-host wording
for await (const file of walk(DIST)) {
	if (!TEXT.test(file)) continue;
	const text = await readFile(file, 'utf8');
	const banned = !file.startsWith(join(DIST, 'theme') + '/') && text.match(BANNED);
	if (banned) problems.push(`${file}: mentions self-hosting ("${banned[0]}")`);
	if (file.endsWith('.css')) {
		for (const [, , url] of text.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) {
			if (!url.startsWith('data:') && !sameOrigin(url)) problems.push(`${file}: loads from another origin: ${url}`);
		}
	}
}

console.log(`check: ${pages.size} pages`);
if (problems.length) {
	console.error(problems.slice(0, 30).join('\n'));
	console.error(`check: ${problems.length} problem(s)`);
	process.exit(1);
}
