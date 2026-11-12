// `npm run check`, after a build: checks dist/ and exits 1 on any problem.
//  - Every href="#x" points at an id on the same page, and every href="/<repo>/#x" at an id on that
//    guide page, so links written for GitHub (#-installation, #ai) keep working.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
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

console.log(`check: ${pages.size} pages`);
if (problems.length) {
	console.error(problems.slice(0, 30).join('\n'));
	console.error(`check: ${problems.length} problem(s)`);
	process.exit(1);
}
