// Headless smoke test for a built or deployed docs site. Loads each page once per theme and fails
// (exit 1) on a console error, a CSP violation, a request to another host, a wrong Starlight base
// (data-sl-theme must follow the theme's color-scheme) or search that returns nothing.
// Usage: node scripts/smoke.mjs <base URL> [--shots <dir>] [--themes a,b] [--pages /,/somaari-plan/]
// Uses the system Chromium (CHROMIUM env var to override), so nothing is downloaded.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const base = (args.find((a) => !a.startsWith('--') && /^https?:/.test(a)) || '').replace(/\/$/, '');
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };
if (!base) { console.error('usage: node scripts/smoke.mjs <base URL> [--shots dir] [--themes a,b] [--pages /,/x/]'); process.exit(2); }

const THEMES = (opt('themes') || 'rangoli,monsoon,pi-console,liquid-glass').split(',');
const PAGES = (opt('pages') || '/,/somaari-plan/').split(',');
const SEARCH = opt('search') || 'install';
const shots = opt('shots');
if (shots) await mkdir(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
const origin = new URL(base).origin;
const failures = [];
let searchChecked = false;

for (const theme of THEMES) {
	for (const path of PAGES) {
		const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
		const where = `${path} [${theme}]`;
		page.on('response', (r) => { if (r.status() >= 400) failures.push(`${where} HTTP ${r.status()}: ${r.url()}`); });
		page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) failures.push(`${where} console: ${m.text().slice(0, 200)}`); });
		page.on('pageerror', (e) => failures.push(`${where} pageerror: ${e.message.slice(0, 200)}`));
		page.on('request', (r) => {
			const u = new URL(r.url());
			if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== origin && u.hostname !== 'static.cloudflareinsights.com' && u.hostname !== 'cloudflareinsights.com')
				failures.push(`${where} external request: ${r.url()}`);
		});
		await page.addInitScript(() => {
			document.addEventListener('securitypolicyviolation', (e) =>
				console.error(`CSP violation: ${e.violatedDirective} blocked ${e.blockedURI || 'inline'} (${e.sourceFile}:${e.lineNumber})`));
		});
		const res = await page.goto(`${base}${path}?theme=${theme}`, { waitUntil: 'networkidle' });
		if (!res || res.status() !== 200) failures.push(`${where} HTTP ${res && res.status()}`);
		const state = await page.evaluate(() => ({
			theme: document.documentElement.getAttribute('data-theme'),
			sl: document.documentElement.getAttribute('data-sl-theme'),
			scheme: getComputedStyle(document.documentElement).colorScheme,
			// Text contrast on the header and on the guide text, against the colour behind it.
			contrast: (() => {
				const rgb = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
				const lum = (c) => rgb(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
					.reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
				const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
				const header = document.querySelector('header');
				const surface = getComputedStyle(header).backgroundColor;
				const text = document.querySelector('.sl-markdown-content p, main p');
				return {
					header: ratio(getComputedStyle(document.querySelector('.wordmark a, .site-title')).color, surface),
					body: text ? ratio(getComputedStyle(text).color, surface) : 99,
				};
			})(),
			picker: !document.getElementById('theme-picker')?.hidden,
		}));
		if (state.theme !== theme) failures.push(`${where} data-theme is ${state.theme}`);
		const want = /dark/.test(state.scheme) ? 'dark' : 'light';
		if (state.sl !== want) failures.push(`${where} data-sl-theme is ${state.sl}, color-scheme is ${state.scheme}`);
		for (const [k, v] of Object.entries(state.contrast)) if (!(v >= 4.5)) failures.push(`${where} ${k} text contrast ${v.toFixed(2)} < 4.5`);
		if (!state.picker) failures.push(`${where} Appearance control not shown`);
		if (shots) await page.screenshot({ path: `${shots}/${theme}${path.replace(/\/$/, '').replace(/\//g, '_') || '_index'}.png` });

		if (!searchChecked && path !== '/') {
			await page.click('button[data-open-modal]');
			await page.fill('#starlight__search input', SEARCH);
			const hit = await page.waitForSelector('#starlight__search .pagefind-ui__result', { timeout: 10000 }).catch(() => null);
			if (!hit) failures.push(`${where} search for "${SEARCH}" showed no results`);
			if (shots) await page.screenshot({ path: `${shots}/search.png` });
			searchChecked = true;
		}
		await page.close();
	}
}
await browser.close();

if (failures.length) {
	console.error([...new Set(failures)].join('\n'));
	console.error(`smoke: FAIL (${failures.length})`);
	process.exit(1);
}
console.log(`smoke: OK, ${THEMES.length} themes x ${PAGES.length} pages, search checked`);
