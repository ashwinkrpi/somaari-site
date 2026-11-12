// node --test: scripts/import-guides.mjs. Unit tests for the Markdown conversion, and runs of the
// script against a temporary --local tree for each failure the build must stop on.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertGuide, GuideError, publishedGuides } from '../scripts/import-guides.mjs';

const FIXTURES = fileURLToPath(new URL('fixtures/', import.meta.url));
const SCRIPT = fileURLToPath(new URL('../scripts/import-guides.mjs', import.meta.url));
const guide = (name) => readFileSync(join(FIXTURES, 'guides', name), 'utf8');

const APP = { repo: 'fixture-app', title: 'Fixture App', guide: { ref: 'main', src: 'docs/GUIDE.md' } };
const OTHER = { repo: 'other-app', title: 'Other App', guide: { ref: 'main', src: 'docs/GUIDE.md' } };
const opts = { owner: 'ashwinkrpi', published: publishedGuides([APP, OTHER]) };
const convert = (md) => convertGuide(APP, md, opts);

test('frontmatter: manifest title, description and the GitHub banner', () => {
	const { markdown, title } = convert(guide('ok.md'));
	assert.equal(title, 'Fixture App');
	assert.match(markdown, /^---\ntitle: "Fixture App"\n/);
	assert.match(markdown, /description: "How to install, set up and use Fixture App \(fixture-app\)\."/);
	assert.match(markdown, /This guide is kept in the fixture-app repository on GitHub\./);
	assert.match(markdown, /href=\\"https:\/\/github\.com\/ashwinkrpi\/fixture-app\/blob\/main\/docs\/GUIDE\.md\\">View it on GitHub/);
});

test('a "# " heading outside code becomes the title', () => {
	const { markdown, title } = convert('# My *Guide*\n\nText.\n');
	assert.equal(title, 'My Guide');
	assert.doesNotMatch(markdown.split('---\n')[2], /^# /m);
});

test('GitHub alerts become Starlight asides with GitHub titles', () => {
	const { markdown } = convert(guide('ok.md'));
	for (const aside of [':::note[Note]', ':::tip[Tip]', ':::note[Important]', ':::caution[Warning]', ':::danger[Caution]']) {
		assert.ok(markdown.includes(aside), aside);
	}
	assert.match(markdown, /:::note\[Note\]\nA note with a \[link\]\(#-installation\)\.\n:::/);
	assert.doesNotMatch(markdown.replace(/```[\s\S]*?```/g, ''), /\[!NOTE\]/);
});

test('links: anchors kept, guides on the site, other repo files on GitHub', () => {
	const { markdown } = convert(guide('ok.md'));
	assert.ok(markdown.includes('[Installation](#-installation)'));
	assert.ok(markdown.includes('[README](https://github.com/ashwinkrpi/fixture-app/blob/main/README.md)'));
	assert.ok(markdown.includes('[other guide](/other-app/#setup)'));
	assert.ok(markdown.includes('[this guide on GitHub](/fixture-app/)'));
	assert.ok(markdown.includes('[the licence](https://github.com/ashwinkrpi/fixture-app/blob/main/LICENSE)'));
	assert.ok(markdown.includes('[a site](https://example.com/)'));
});

test('images: served from /<repo>/, banner and site:skip blocks removed', () => {
	const { markdown, images } = convert(guide('ok.md'));
	assert.ok(markdown.includes('<img src="/fixture-app/screenshots/shot.png"'));
	assert.ok(markdown.includes('![Inline image](/fixture-app/screenshots/shot.png)'));
	assert.deepEqual([...images], [['docs/screenshots/shot.png', 'screenshots/shot.png']]);
	assert.doesNotMatch(markdown, /banner\.svg|stays on GitHub only/);
});

test('code blocks and code spans are left as written', () => {
	const { markdown } = convert(guide('ok.md'));
	assert.ok(markdown.includes('# Not a heading\n> [!NOTE] not an alert inside code\n[not a link](../README.md)'));
	assert.ok(markdown.includes('Inline `[code](../README.md)` stays as written.'));
});

test('conversion errors', () => {
	assert.throws(() => convert(guide('self-host.md')), (e) => e instanceof GuideError && /self-host/.test(e.message));
	assert.throws(() => convert(guide('image-outside-folder.md')), /image outside docs\//);
	assert.throws(() => convert(guide('image-other-site.md')), /image from outside the repo/);
	assert.throws(() => convert('See [up](../../x.md).\n'), /link outside the repo/);
});

const tempDirs = [];
after(() => tempDirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

/** Runs the import against a temporary --local tree holding fixture-app with this guide. */
function runImport(guideName, { images = true } = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'somaari-docs-test-'));
	tempDirs.push(dir);
	{
		mkdirSync(join(dir, 'somaari-common', 'apps'), { recursive: true });
		writeFileSync(join(dir, 'somaari-common', 'apps', 'apps.json'),
			JSON.stringify({ github: 'ashwinkrpi', apps: [{ ...APP, detail_page: true, description: 'A fixture.' }] }));
		const docs = join(dir, 'fixture-app', 'docs');
		mkdirSync(docs, { recursive: true });
		if (guideName) cpSync(join(FIXTURES, 'guides', guideName), join(docs, 'GUIDE.md'));
		if (images) {
			cpSync(join(FIXTURES, 'images'), join(docs, 'images'), { recursive: true });
			cpSync(join(FIXTURES, 'images'), join(docs, 'screenshots'), { recursive: true });
		}
		const out = join(dir, 'out');
		const r = spawnSync(process.execPath, [SCRIPT, '--local', dir, '--out', out], { encoding: 'utf8' });
		return {
			status: r.status,
			stderr: r.stderr,
			wrote: (p) => existsSync(join(out, p)),
			read: (p) => readFileSync(join(out, p), 'utf8'),
		};
	}
}

test('import writes the guide, its images and the app list', () => {
	const r = runImport('ok.md');
	assert.equal(r.status, 0, r.stderr);
	assert.ok(r.wrote('src/content/docs/fixture-app/index.md'));
	assert.ok(r.wrote('public/fixture-app/screenshots/shot.png'));
	assert.ok(!r.wrote('public/fixture-app/images/banner.svg'));
	assert.deepEqual(JSON.parse(r.read('src/generated/apps.json')), [
		{ repo: 'fixture-app', title: 'Fixture App', description: 'A fixture.', detail_page: true, guide: true },
	]);
});

for (const [name, guideName, message, extra] of [
	['a guide that can\'t be read', null, /can't read the guide/],
	['self-host wording in the text', 'self-host.md', /self-host/],
	['self-host wording in an SVG', 'svg-self-host.md', /SVG mentions self-hosting/],
	['an image from outside the guide folder', 'image-outside-folder.md', /image outside docs\//],
	['an image from another site', 'image-other-site.md', /image from outside the repo/],
	['an image that is missing', 'ok.md', /can't read image/, { images: false }],
]) {
	test(`import exits 1 on ${name}`, () => {
		const r = runImport(guideName, extra);
		assert.equal(r.status, 1);
		assert.match(r.stderr, message);
	});
}
