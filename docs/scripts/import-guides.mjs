// Imports each app's guide into Starlight before `astro build` (run by scripts/build.mjs).
//   node scripts/import-guides.mjs [--local <dir>] [--out <dir>]
// Reads the app manifest (somaari-common apps/apps.json) and, for every app with a `guide`, its
// Markdown and images: from sibling checkouts with --local, otherwise from GitHub. Writes
//   src/content/docs/<repo>/index.md   the guide, converted for Starlight (convertGuide below)
//   public/<repo>/<path>               its images, at their path relative to the guide
//   src/generated/apps.json            the manifest apps, for the sidebar and the home page
// all under --out (default: this repo). The guide folders are generated and git-ignored.
// Exits 1 if a guide can't be read, mentions self-hosting (text or SVG), or uses an image from
// outside its folder or from another site. Ported from somaari-site's scripts/build-docs.mjs.
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFile, getManifest, option } from './lib.mjs';

// The somaari sites never mention self-hosting (not every somaari app is self-hosted).
export const BANNED = /self[- ]?host/i;
// The guides open with a banner image; the docs page has its own title instead.
const BANNER = /<img\b[^>]*\bsrc="[^"]*banner\.svg"[^>]*>|!\[[^\]]*\]\([^)]*banner\.svg\)/g;
// A guide can keep a section on GitHub only: <!-- site:skip --> ... <!-- /site:skip -->
const SKIP = /<!--\s*site:skip\s*-->[\s\S]*?<!--\s*\/site:skip\s*-->/g;
// GitHub alerts → Starlight asides, keeping GitHub's title.
const ASIDES = {
	NOTE: ['note', 'Note'],
	TIP: ['tip', 'Tip'],
	IMPORTANT: ['note', 'Important'],
	WARNING: ['caution', 'Warning'],
	CAUTION: ['danger', 'Caution'],
};
const FENCE = /^\s*(`{3,}|~{3,})/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export class GuideError extends Error {}

// A row of section links ("[Installation](#…) ·" on each line), which the "On this page" list replaces.
const LINK_ROW = /^\[[^\]]+\]\([^)]+\)\s*·?\s*$/;

/**
 * The guides open with a centred <div align="center"> intro for GitHub: a bold line, a README line and
 * a row of section links. On the site that becomes one plain left-aligned paragraph, without the
 * links row (the "On this page" list does that job).
 */
export function tidyIntro(text) {
	const m = text.match(/^(\s*)<div align="center">\n([\s\S]*?)\n<\/div>\n/);
	if (!m) return text;
	const paras = m[2].split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && p !== '<br>');
	const kept = paras
		.filter((p) => !p.split('\n').every((l) => LINK_ROW.test(l.trim())))
		.map((p) => p.replace(/<br>\s*/g, ' ').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s*\n\s*/g, ' ').trim());
	return m[1] + kept.join('\n\n') + '\n' + text.slice(m[0].length);
}

/** The guide pages of every app with a guide: "<repo>:<src>" → "/<repo>/". */
export const publishedGuides = (apps) =>
	new Map(apps.filter((a) => a.guide).map((a) => [`${a.repo}:${a.guide.src}`, `/${a.repo}/`]));

/**
 * One guide's Markdown → Starlight Markdown with frontmatter. Returns { markdown, title, images },
 * images being Map(repo path → path relative to the guide's folder). Throws GuideError.
 */
export function convertGuide(app, source, { owner, published }) {
	const { src, ref } = app.guide;
	const docDir = posix.dirname(src);
	const fail = (message) => {
		throw new GuideError(`${app.repo}/${src}: ${message}`);
	};
	const images = new Map();

	function rewriteLink(href) {
		if (href.startsWith('#')) return href;
		const onGithub = href.match(new RegExp(`^https://github\\.com/${owner}/([^/]+)/blob/[^/]+/([^#?]+)(#.*)?$`));
		if (onGithub) {
			const page = published.get(`${onGithub[1]}:${onGithub[2]}`);
			return page ? page + (onGithub[3] ?? '') : href;
		}
		if (SCHEME.test(href) || href.startsWith('/')) return href;
		const [path, frag = ''] = href.split(/(?=#)/);
		const target = posix.normalize(posix.join(docDir, decodeURI(path)));
		if (target.startsWith('..')) fail(`link outside the repo: ${href}`);
		const page = published.get(`${app.repo}:${target}`);
		if (page) return page + frag;
		return encodeURI(`https://github.com/${owner}/${app.repo}/blob/${ref}/${target}`) + frag;
	}

	function rewriteImage(srcAttr) {
		if (SCHEME.test(srcAttr) || srcAttr.startsWith('/') || srcAttr.startsWith('//')) {
			fail(`image from outside the repo: ${srcAttr} (the site only serves its own images)`);
		}
		const target = posix.normalize(posix.join(docDir, decodeURI(srcAttr)));
		const rel = posix.relative(docDir, target);
		if (rel.startsWith('..')) fail(`image outside ${docDir}/: ${srcAttr}`);
		images.set(target, rel);
		// Absolute, so raw <img> tags and Markdown images both load from public/<repo>/.
		return `/${app.repo}/${encodeURI(rel)}`;
	}

	// Links and images on one line of prose; `code spans` are left alone.
	function rewriteLine(line) {
		const code = [];
		let out = line.replace(/(`+)[\s\S]*?\1/g, (m) => `\u0000${code.push(m) - 1}\u0000`);
		out = out
			.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)(\s+"[^"]*")?\s*\)/g, (_, alt, s, t = '') => `![${alt}](${rewriteImage(s)}${t})`)
			.replace(/(?<!!)\[([^\]]*)\]\(\s*([^)\s]+)(\s+"[^"]*")?\s*\)/g, (_, text, h, t = '') => `[${text}](${rewriteLink(h)}${t})`)
			.replace(/(<img\b[^>]*?\ssrc=")([^"]*)(")/gi, (_, a, s, b) => a + rewriteImage(s) + b)
			.replace(/(<a\b[^>]*?\shref=")([^"]*)(")/gi, (_, a, h, b) => a + rewriteLink(h) + b);
		return out.replace(/\u0000(\d+)\u0000/g, (_, i) => code[Number(i)]);
	}

	const text = tidyIntro(source.replace(/\r\n/g, '\n').replace(SKIP, '').replace(BANNER, ''));
	const banned = text.match(BANNED);
	if (banned) fail(`mentions self-hosting ("${banned[0]}"); reword it in the app repo`);

	const lines = text.split('\n');
	const out = [];
	let fence = null;
	let title = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const f = line.match(FENCE);
		if (fence) {
			out.push(line);
			if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null;
			continue;
		}
		if (f) {
			fence = f[1];
			out.push(line);
			continue;
		}
		const h1 = title === null && line.match(/^#\s+(.+?)\s*#*\s*$/);
		if (h1) {
			title = h1[1];
			if (lines[i + 1] === '') i++;
			continue;
		}
		const alert = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/);
		if (alert) {
			const [kind, label] = ASIDES[alert[1]];
			const body = alert[2] ? [alert[2]] : [];
			while (i + 1 < lines.length && lines[i + 1].startsWith('>')) body.push(lines[++i].replace(/^> ?/, ''));
			out.push(`:::${kind}[${label}]`, ...body.map(rewriteLine), ':::');
			continue;
		}
		out.push(rewriteLine(line));
	}
	// The guides open with a centred intro instead of a "# " heading: then the manifest title is used.
	const plainTitle = (title ?? app.title).replace(/[*_`]/g, '').trim();
	const githubUrl = `https://github.com/${owner}/${app.repo}/blob/${ref}/${src}`;
	const frontmatter = [
		'---',
		`title: ${JSON.stringify(plainTitle)}`,
		`description: ${JSON.stringify(`How to install, set up and use ${app.title} (${app.repo}).`)}`,
		'editUrl: false',
		'---',
		'',
		// A small muted line under the title (was an accent-coloured banner across the page).
		`<p class="guide-source">Source: <a href="${githubUrl}">${app.repo}/${src}</a> on GitHub</p>`,
		'', // a blank line ends the HTML block, so the Markdown after it is parsed
		'',
	];
	return { markdown: frontmatter.join('\n') + out.join('\n').replace(/^\n+/, ''), title: plainTitle, images };
}

async function main(argv) {
	const local = option(argv, 'local');
	const root = option(argv, 'out') ?? fileURLToPath(new URL('..', import.meta.url));
	const manifest = await getManifest({ local });
	const owner = manifest.github;
	const src = { local, owner };
	const apps = manifest.apps;
	const published = publishedGuides(apps);
	const docsDir = join(root, 'src', 'content', 'docs');
	const publicDir = join(root, 'public');
	const generated = join(root, 'src', 'generated', 'apps.json');

	// Clear what the last run generated, so a guide or image that was removed doesn't linger.
	let previous = [];
	try {
		previous = JSON.parse(await readFile(generated, 'utf8')).map((a) => a.repo);
	} catch {
		// first run
	}
	for (const repo of new Set([...previous, ...apps.map((a) => a.repo)])) {
		await rm(join(docsDir, repo), { recursive: true, force: true });
		await rm(join(publicDir, repo), { recursive: true, force: true });
	}

	let count = 0;
	for (const app of apps.filter((a) => a.guide)) {
		let source;
		try {
			source = (await getFile(src, app.repo, app.guide.ref, app.guide.src)).toString('utf8');
		} catch (e) {
			throw new GuideError(`${app.repo}/${app.guide.src}: can't read the guide (${e.message})`);
		}
		const { markdown, images } = convertGuide(app, source, { owner, published });
		await mkdir(join(docsDir, app.repo), { recursive: true });
		await writeFile(join(docsDir, app.repo, 'index.md'), markdown);
		for (const [repoPath, rel] of images) {
			let data;
			try {
				data = await getFile(src, app.repo, app.guide.ref, repoPath);
			} catch (e) {
				throw new GuideError(`${app.repo}/${app.guide.src}: can't read image ${repoPath} (${e.message})`);
			}
			if (rel.endsWith('.svg') && BANNED.test(data.toString('utf8'))) {
				throw new GuideError(`${app.repo}/${repoPath}: the SVG mentions self-hosting; reword it in the app repo`);
			}
			await mkdir(dirname(join(publicDir, app.repo, rel)), { recursive: true });
			await writeFile(join(publicDir, app.repo, rel), data);
		}
		count++;
		console.log(`import-guides: ${app.repo} (${images.size} images)`);
	}

	// status, tags and the AI chip feed the home page cards, which match somaari.in's.
	const list = apps.map(({ repo, title, description, status, tags, ai, detail_page, guide }) => ({
		repo, title, description, status: status || null, tags: tags || [], ai: ai?.label || null,
		detail_page: !!detail_page, guide: !!guide,
	}));
	await mkdir(dirname(generated), { recursive: true });
	await writeFile(generated, JSON.stringify(list, null, 2) + '\n');
	console.log(`import-guides: ${count} guides from ${local ? local : 'GitHub'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main(process.argv.slice(2)).catch((e) => {
		console.error(`import-guides: ${e.message}`);
		process.exit(1);
	});
}
