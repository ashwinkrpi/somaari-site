// After the build: every page in dist/ links /theme/theme.js and /theme/themes.css as
// ?v=<first 10 hex of the file's sha256>, so browsers that cache /theme/ fetch a changed theme at
// once. Same as stampThemeVersions() in somaari-site's build.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const version = async (f) =>
	createHash('sha256').update(await readFile(join(DIST, 'theme', f))).digest('hex').slice(0, 10);
const v = { 'theme.js': await version('theme.js'), 'themes.css': await version('themes.css') };

let pages = 0;
for (const page of (await readdir(DIST, { recursive: true })).filter((f) => f.endsWith('.html'))) {
	const html = await readFile(join(DIST, page), 'utf8');
	const out = html.replace(/(["'])\/theme\/(theme\.js|themes\.css)\1/g, (_, q, f) => `${q}/theme/${f}?v=${v[f]}${q}`);
	if (out !== html) {
		await writeFile(join(DIST, page), out);
		pages++;
	}
}
console.log(`stamp-theme: ${pages} pages, theme.js?v=${v['theme.js']}, themes.css?v=${v['themes.css']}`);
