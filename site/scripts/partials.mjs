// The shared header, built from network.json. Pages get it from
// scripts/build.mjs, which writes it between <!-- SHARED HEADER --> markers. The footer is somaari-common's
// theme/footer.mjs (downloaded with the themes), which build.mjs writes between <!-- SHARED FOOTER --> markers.
// Other Somaari repos (such as somaari-docs) can copy this file next to their own build script and call
// header(network, "docs") with the network.json they fetched (see fetch-network.mjs).
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
        <a class="search-link" href="/search/" aria-label="Search"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
        <!-- Appearance (theme) control: theme.js (somaari-common) adds the choices, shows it, opens the
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
