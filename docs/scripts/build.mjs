// `npm run build [-- --local <dir>]`: import the guides, build with Astro, then make dist/ fit the
// strict CSP. The options go to the import step (npm would only pass them to the last command of a
// `&&` chain, so the steps run from here).
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const steps = [
	[process.execPath, ['scripts/import-guides.mjs', ...args]],
	['node_modules/.bin/astro', ['build']],
	[process.execPath, ['scripts/postbuild.mjs']],
];
for (const [cmd, argv] of steps) {
	const r = spawnSync(cmd, argv, { stdio: 'inherit' });
	if (r.status !== 0) process.exit(r.status ?? 1);
}
