// The shared Somaari header pieces, built from network.json the way header(network, "docs")
// in vendor/somaari-site/partials.mjs builds them, but with full https://somaari.in/... URLs
// (this is a different origin) and without the parts Starlight supplies itself: search, the Appearance control
// (ThemeSelect) and the mobile menu button. scripts/build.mjs refreshes network.json before Astro runs.
// network.json is imported (bundled by Vite), not read from disk at render time.
import network from '../../network.json';

const CURRENT = 'docs';
const SITE = 'https://somaari.in';

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Absolute URL: somaari.in paths in network.json are made full.
const href = (url) => escapeHtml(/^https?:\/\//.test(url) || url.startsWith('mailto:') ? url : new URL(url, `${SITE}/`).href);
const cur = (s) => (s.id === CURRENT ? ' aria-current="true"' : '');

// <li> links for the site nav: every site, Docs marked.
export function navItems() {
	return network.sites.map((s) => `<li><a href="${href(s.url)}"${cur(s)}>${escapeHtml(s.label)}</a></li>`).join('');
}

// <li> links for GitHub and YouTube (icons).
export function socialLinks() {
	return `<li><a href="${escapeHtml(network.social.github)}" aria-label="GitHub"><svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a></li>`
		+ `<li><a href="${escapeHtml(network.social.youtube)}" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg></a></li>`;
}

