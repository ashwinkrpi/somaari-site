// Copies the shared somaari themes into public/theme/ before `astro build` (run by scripts/build.mjs).
//   node scripts/import-theme.mjs [--local <dir>] [--out <dir>]
// The file list is somaari-common's theme/files.json; files come from <dir>/somaari-common/theme/
// with --local, otherwise from GitHub (main). public/theme/ is generated and git-ignored: never edit
// it by hand. scripts/stamp-theme.mjs adds ?v=<hash> to the links after the build.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCommonFile, option } from './lib.mjs';

const argv = process.argv.slice(2);
const src = { local: option(argv, 'local') };
const out = join(option(argv, 'out') ?? fileURLToPath(new URL('..', import.meta.url)), 'public', 'theme');

try {
	const { files } = JSON.parse((await getCommonFile(src, 'theme/files.json')).toString('utf8'));
	await rm(out, { recursive: true, force: true });
	for (const f of files) {
		await mkdir(dirname(join(out, f)), { recursive: true });
		await writeFile(join(out, f), await getCommonFile(src, `theme/${f}`));
	}
	console.log(`import-theme: ${files.length} files from ${src.local ?? 'GitHub'}`);
} catch (e) {
	console.error(`import-theme: ${e.message}`);
	process.exit(1);
}
