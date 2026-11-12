// `npm run build [-- --local <dir>]`: import the guides and the themes, build with Astro, make dist/
// fit the strict CSP, then version the theme links. The options go to the import step (npm would only pass them to the last command of a
// `&&` chain, so the steps run from here).
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const steps = [
	[process.execPath, ['scripts/import-guides.mjs', ...args]],
	[process.execPath, ['scripts/import-theme.mjs', ...args]],
	['node_modules/.bin/astro', ['build']],
	[process.execPath, ['scripts/postbuild.mjs']],
	[process.execPath, ['scripts/stamp-theme.mjs']],
];
for (const [cmd, argv] of steps) {
	const r = spawnSync(cmd, argv, { stdio: 'inherit' });
	if (r.status !== 0) process.exit(r.status ?? 1);
}
