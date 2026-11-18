// Shared by the build scripts: command-line options and reading files from the somaari repos, either
// from sibling checkouts (--local <dir>) or from GitHub.
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const COMMON = 'somaari-common';
const DEFAULT_OWNER = 'ashwinkrpi';

/** The value after `--name` in argv, or null. */
export function option(argv, name) {
	const i = argv.indexOf(`--${name}`);
	return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

/**
 * A file from a somaari repo. With `local`, from `<local>/<repo>/<path>` (the working tree);
 * otherwise from raw.githubusercontent.com at `ref`. Returns a Buffer; throws if it can't be read.
 */
export async function getFile({ local, owner = DEFAULT_OWNER }, repo, ref, path) {
	if (local) return readFile(resolve(local, repo, path));
	const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${repo}: ${path} not found on ${ref} (HTTP ${res.status}). Is the repo public?`);
	return Buffer.from(await res.arrayBuffer());
}

/**
 * The date (ISO 8601) of the latest commit that touched `path` in a somaari repo: from the sibling
 * checkout's git history with `local`, otherwise from the GitHub API for `ref`. Returns null when it
 * can't be read (no checkout history, offline, rate limit): callers then show no date.
 */
export async function getLastCommitDate({ local, owner = DEFAULT_OWNER }, repo, ref, path) {
	try {
		let iso = null;
		if (local) {
			const r = spawnSync('git', ['-C', resolve(local, repo), 'log', '-1', '--format=%cI', '--', path], { encoding: 'utf8' });
			if (r.status === 0) iso = r.stdout.trim();
		} else {
			const qs = new URLSearchParams({ path, sha: ref, per_page: '1' });
			const headers = { Accept: 'application/vnd.github+json' };
			if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
			const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?${qs}`, { headers });
			if (res.ok) iso = (await res.json())?.[0]?.commit?.committer?.date ?? null;
		}
		return iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
	} catch {
		return null;
	}
}

/** somaari-common's app manifest (apps/apps.json on main). */
export async function getManifest(src) {
	return JSON.parse((await getFile(src, COMMON, 'main', 'apps/apps.json')).toString('utf8'));
}

/** A file from somaari-common's main branch. */
export const getCommonFile = (src, path) => getFile(src, COMMON, 'main', path);
