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

