// The shared header (with the "Somaari sites" switcher) and footer, built from network.json. Pages get them
// from scripts/build.mjs, which writes them between <!-- SHARED HEADER --> / <!-- SHARED FOOTER --> markers.
// Other Somaari repos (such as somaari-docs) can copy this file next to their own build script and call
// header(network, "docs") and footer(network) with the network.json they fetched (see fetch-network.mjs).
// The current site gets aria-current="true" in the header; pass the id of the site the page belongs to.
// The header's script tag has a "NAVV" placeholder for nav.js's content hash, which the caller replaces.
export const SITE = "https://somaari.in";

export function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Links to somaari.in itself are written relative; other sites keep their full URL.
const href = (url) => escapeHtml(url.startsWith(`${SITE}/`) ? url.slice(SITE.length) : url);

// The shared header: the logo (links to somaari.in), then the "main" and "lab" sites in network.json order,
// the current site marked aria-current. On phones nav.js turns the links into a drawer opened by the menu
// button; without JS they stay visible.
export function header(network, current) {
  const items = network.sites.map((s) => {
    const cur = s.id === current ? ' aria-current="true"' : "";
    return `            <li><a href="${href(s.url)}"${cur}>${escapeHtml(s.label)}</a></li>`;
  }).join("\n");
  const github = escapeHtml(network.social.github);
  const youtube = escapeHtml(network.social.youtube);
  const tile = (s) => `<li><a href="${href(s.url)}"${s.id === current ? ' aria-current="true"' : ""}><strong>${escapeHtml(s.label)}</strong> <span>${escapeHtml(s.description)}</span>${s.note ? ` <em>${escapeHtml(s.note)}</em>` : ""}</a></li>`;
  const group = (name, title) => {
    const sites = network.sites.filter((s) => (s.group ?? "main") === name);
    return sites.length ? `
              <section class="switcher-group">
                <h2>${title}</h2>
                <ul role="list">
                  ${sites.map(tile).join("\n                  ")}
                </ul>
              </section>` : "";
  };
  const switcher = `<div class="switcher" id="site-switcher" hidden>
          <button type="button" class="switcher-toggle" id="switcher-toggle" aria-expanded="false" aria-controls="switcher-menu">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="currentColor"><rect x="4" y="4" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="4" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="4" width="4.5" height="4.5" rx="1"/><rect x="4" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="4" y="15.5" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="15.5" width="4.5" height="4.5" rx="1"/><rect x="15.5" y="15.5" width="4.5" height="4.5" rx="1"/></g></svg>
            <span class="visually-hidden">Somaari sites</span>
          </button>
          <div class="switcher-menu" id="switcher-menu" role="group" aria-label="Somaari sites" hidden>${group("main", "Somaari sites")}${group("lab", "Lab")}
          </div>
        </div>
        `;
  return `<!-- SHARED HEADER: built from network.json by scripts/build.mjs; identical on every page except 404.html -->
  <header class="site-header">
    <div class="container header-inner">
      <div class="brand">
        <p class="wordmark">
          <a href="/">
            <span class="wordmark-mark" aria-hidden="true">S</span>
            Somaari
          </a>
        </p>
        <p class="tagline">Useful tools, built with AI assistance.</p>
      </div>
      <div class="header-end">
        <nav class="site-nav" id="site-drawer" aria-label="Main">
          <ul role="list">
${items}
            <li class="nav-search"><a href="/search/">Search</a></li>
          </ul>
        </nav>
        <ul class="header-social" role="list">
          <li><a href="${github}" aria-label="GitHub">
            <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
          </a></li>
          <li><a href="${youtube}" target="_blank" rel="noopener" aria-label="YouTube">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>
          </a></li>
        </ul>
        <a class="search-link" href="/search/" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
        ${switcher}<!-- Appearance (theme) control: theme.js (somaari-common) adds the choices, shows it, opens the
             popover and remembers the choice. Themes live in themes.css and style.css. -->
        <div class="appearance" id="theme-picker" hidden>
          <button type="button" class="appearance-toggle" id="appearance-toggle" aria-expanded="false" aria-controls="appearance-menu">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>
            </svg>
            <span class="visually-hidden">Appearance</span>
          </button>
          <div class="appearance-menu" id="appearance-menu" hidden>
            <fieldset>
              <legend>Theme</legend>
            </fieldset>
          </div>
        </div>
        <button type="button" class="menu-toggle" id="menu-toggle" aria-expanded="false" aria-controls="site-drawer">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="visually-hidden">Menu</span>
        </button>
      </div>
    </div>
  </header>
  <script src="/nav.js?v=NAVV" defer></script>
  <!-- /SHARED HEADER -->`;
}

// The shared footer: every site (Lab marked), GitHub, YouTube and RSS, both contact emails, About, Privacy,
// Terms, and the author line.
export function footer(network) {
  const blog = network.sites.find((s) => s.id === "blog");
  const rss = new URL("rss.xml", blog.url).href;
  const sites = network.sites.map((s) => {
    const lab = s.group === "lab" ? ' <span class="footer-tag">(Lab)</span>' : "";
    return `            <li><a href="${href(s.url)}">${escapeHtml(s.label)}</a>${lab}</li>`;
  }).join("\n");
  const mail = (addr, what) => `            <li><a href="mailto:${escapeHtml(addr)}">${escapeHtml(addr)}</a> <span class="footer-tag">${what}</span></li>`;
  return `<!-- SHARED FOOTER: built from network.json by scripts/build.mjs; identical on every page -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <nav class="footer-cols" aria-label="Footer">
        <ul class="footer-links" role="list">
${sites}
        </ul>
        <ul class="footer-links" role="list">
          <li><a href="${escapeHtml(network.social.github)}">GitHub</a></li>
          <li><a href="${escapeHtml(network.social.youtube)}" target="_blank" rel="noopener">YouTube</a></li>
          <li><a href="${escapeHtml(rss)}">RSS</a></li>
        </ul>
        <ul class="footer-links" role="list">
${mail(network.contact.general, "General")}
${mail(network.contact.apps, "App support")}
        </ul>
        <ul class="footer-links" role="list">
          <li><a href="/about/">About</a></li>
          <li><a href="/privacy/">Privacy</a></li>
          <li><a href="/terms/">Terms</a></li>
        </ul>
      </nav>
      <p class="footer-author">Built by ${escapeHtml(network.author)}</p>
      <p>&copy; 2026 Somaari</p>
    </div>
  </footer>
  <!-- /SHARED FOOTER -->`;
}

// JSON-LD structured data (schema.org), built from network.json. jsonLd() wraps one object in a script tag;
// "<" is escaped so no text can end the script early.
export function jsonLd(data) {
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, "\\u003c")}\n</script>`;
}

// The owner's sites as URLs for sameAs: the GitHub and YouTube links, then every other Somaari site (its subdomain).
function sameAs(network) {
  const urls = [network.social.github, network.social.youtube, ...network.sites.map((s) => s.url)]
    .filter((u) => u && new URL(u).hostname !== "somaari.in");
  return [...new Set(urls)];
}

// The Organization for the homepage: Somaari, its general contact, its founder and its profiles.
export function organization(network) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "Somaari",
    url: `${SITE}/`,
    email: network.contact.general,
    founder: { "@type": "Person", name: network.author.split(",")[0].trim() },
    sameAs: sameAs(network),
  };
}

// The WebSite for the homepage, published by the Organization.
export function website(network) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "Somaari",
    url: `${SITE}/`,
    description: "Useful software tools by " + network.author.split(",")[0].trim() + " in Bengaluru, built with AI assistance.",
    publisher: { "@id": `${SITE}/#organization` },
    sameAs: sameAs(network),
    inLanguage: "en",
  };
}

// A SoftwareApplication for an app's detail page. "app" holds the page's name, description, url, the
// operating systems it runs on (a list) and, for a public repo, its codeRepository URL. It is free.
export function softwareApplication(app) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.description,
    url: app.url,
    applicationCategory: "UtilitiesApplication",
    ...(app.operatingSystems?.length ? { operatingSystem: app.operatingSystems.join(", ") } : {}),
    ...(app.codeRepository ? { codeRepository: app.codeRepository } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    author: { "@id": `${SITE}/#organization` },
    publisher: { "@id": `${SITE}/#organization` },
  };
}
