// The shared Somaari footer, in three sections: Explore (every site as a tile, Lab marked), Follow (YouTube,
// RSS) and Get in touch (both contact emails and GitHub), then About, Privacy, Terms and the author line.
// Built from somaari.in's network.json. The styles are footer.css, next to this file; they use the standard
// theme tokens, so every theme styles the footer without any per-site CSS. Spec: docs/FOOTER_SPEC.md.
//
// Node:    import { footer } from "./footer.mjs";  footer(network, { local: true })
// Other:   node footer.mjs <network.json> [--local]   prints the HTML (somaari-games calls it this way)
//
// local: true is for somaari.in itself: links to somaari.in pages are written relative ("/about/").
// Everywhere else they are full https://somaari.in/... URLs. No links open anything but a page or a mail
// compose window, and nothing here sends data anywhere.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const SITE = "https://somaari.in";

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 24px stroke icons (Feather/Lucide style), drawn with currentColor. Site icons are keyed by the "icon" field
// of each site in network.json; a site without a known icon just shows its label.
const ICON_PATHS = {
  apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  docs: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  blog: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  games: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.3 6A3 3 0 0 0 4.4 18c1 0 1.7-.5 2.3-1.3L8 15h8l1.3 1.7c.6.8 1.3 1.3 2.3 1.3a3 3 0 0 0 2.9-3.8l-1.3-6A4 4 0 0 0 17.3 5z"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.4 3.4 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.4 5.4 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.4 13.4 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.4 5.4 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.4 3.4 0 0 0 9 18.13V22"/>',
  youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><path d="M9.75 15.02 15.5 11.75 9.75 8.48z"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  terms: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14l2 2 4-4"/>',
  out: '<path d="M7 17 17 7M8 7h9v9"/>',
};
const icon = (name, cls = "footer-icon") =>
  ICON_PATHS[name] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>` : "";

export function footer(network, { local = false } = {}) {
  const href = (url) => escapeHtml(url.startsWith(`${SITE}/`) ? (local ? url.slice(SITE.length) : url) : url);
  const home = (path) => (local ? path : `${SITE}${path}`);
  const blog = network.sites.find((s) => s.id === "blog");
  const rss = new URL("rss.xml", blog.url).href;
  const tiles = network.sites.map((s) => {
    const lab = s.group === "lab" ? ' <span class="footer-tag">Lab</span>' : "";
    return `            <li><a class="footer-tile" href="${href(s.url)}">${icon(s.icon)}<span>${escapeHtml(s.label)}${lab}</span></a></li>`;
  }).join("\n");
  const round = (name, label, url, extra = "") =>
    `            <li><a class="footer-round-link" href="${escapeHtml(url)}"${extra}><span class="footer-round">${icon(name)}</span>${label}</a></li>`;
  const contact = (name, title, sub, url, external = false) =>
    `            <li><a href="${escapeHtml(url)}">${icon(name, "footer-icon footer-icon--lead")}<span class="footer-contact-text"><span class="footer-contact-title">${title}</span><span class="footer-contact-sub">${sub}</span></span>${external ? icon("out", "footer-icon footer-icon--end") : ""}</a></li>`;
  const legal = (name, label, path) => `            <li><a href="${home(path)}">${icon(name)}${label}</a></li>`;
  return `<!-- SHARED FOOTER: built from network.json by somaari-common's footer.mjs; identical on every page -->
  <footer class="site-footer">
    <div class="footer-inner">
      <nav class="footer-sections" aria-label="Footer">
        <section class="footer-section">
          <p class="footer-heading">Explore</p>
          <ul class="footer-tiles" role="list">
${tiles}
          </ul>
        </section>
        <section class="footer-section">
          <p class="footer-heading">Follow</p>
          <ul class="footer-follow" role="list">
${round("youtube", "YouTube", network.social.youtube, ' target="_blank" rel="noopener"')}
${round("rss", "RSS", rss)}
          </ul>
        </section>
        <section class="footer-section">
          <p class="footer-heading">Get in touch</p>
          <ul class="footer-contact" role="list">
${contact("mail", "General inquiries", "Questions, feedback, ideas", `mailto:${network.contact.general}`)}
${contact("mail", "App support", "Help with an app", `mailto:${network.contact.apps}`)}
${contact("github", "GitHub", "Found a bug? Open an issue", network.social.github, true)}
          </ul>
        </section>
      </nav>
      <div class="footer-bottom">
        <ul class="footer-legal" role="list">
${legal("info", "About", "/about/")}
${legal("shield", "Privacy", "/privacy/")}
${legal("terms", "Terms", "/terms/")}
        </ul>
        <p class="footer-author">Built by ${escapeHtml(network.author)}</p>
        <p>&copy; ${new Date().getFullYear()} Somaari</p>
      </div>
    </div>
  </footer>
  <!-- /SHARED FOOTER -->`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) { console.error("usage: node footer.mjs <network.json> [--local]"); process.exit(2); }
  process.stdout.write(footer(JSON.parse(readFileSync(file, "utf8")), { local: flags.includes("--local") }) + "\n");
}
