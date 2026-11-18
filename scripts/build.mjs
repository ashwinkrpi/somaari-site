// Builds the published site into dist/: copies the static files, then downloads what isn't kept here.
// The themes (theme.js, themes.css, fonts) come from somaari-common's theme/ into /theme/. The list of
// apps comes from somaari-common's apps/apps.json (the app manifest): the build writes the landing page
// cards and the sitemap's /apps/<repo>/ entries from it. An app's detail page screenshot ("screenshot")
// and card demo loop ("demo") come from the app repo when the manifest names them, into assets/; they
// are never committed here.
// The app guides are not built here: docs.somaari.in (the somaari-docs repo) publishes them, and
// _redirects sends the old /apps/<repo>/docs/ URLs there.
// Run from the repo root: npm run build
// With --local <dir> it reads <dir>/<repo>/... instead of GitHub (somaari-common too: <dir>/somaari-common/theme/
// and apps/apps.json).
// Exits 1 (and Cloudflare keeps the current deploy) if a file can't be fetched, a screenshot or demo
// doesn't fit, or a manifest app has no page or text the page can't hold.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve } from "node:path";

const OUT = "dist";
// Top-level files and folders copied to dist/ as they are.
const PUBLISH = ["index.html", "404.html", "style.css", "shots.js", "demo.js", "video.js", "nav.js", "favicon.svg", "robots.txt",
  "sitemap.xml", "network.json", "_headers", "_redirects", "apps", "assets", "about", "privacy", "terms"];
// The card demo files on an app's demo branch, and the most each may weigh.
const DEMO_FILES = ["loop.webm", "loop.mp4", "poster.webp"];
const DEMO_MAX_BYTES = 1024 * 1024;
// somaari-common is fetched before the manifest (which names the owner of the app repos) is read.
const COMMON = { repo: "somaari-common", ref: "main", owner: "ashwinkrpi" };
// Read from somaari-common's theme.js by theme(). NOJS_THEME is the theme themes.css gives :root (the
// look without JS); its screenshot goes in <noscript>.
let THEMES, DEFAULT_THEME, NOJS_THEME;

// The manifest's "github" owner and its apps, set by manifest().
let owner, apps;
// YouTube walkthrough IDs per app (an empty ID means no video links on the card).
const VIDEOS = JSON.parse(readFileSync("videos.json", "utf8")).apps;
const STATUS = { live: "Available", dev: "In development", soon: "Coming soon" };
// The landing page lists: <!-- APPS:live --> ... <!-- /APPS:live --> and the same for dev ("soon" apps
// go in the dev list too).
const LISTS = { live: ["live"], dev: ["dev", "soon"] };
// Every card's demo poster is 720x406 (scripts/demo/README.md).
const POSTER = 'width="720" height="406"';
const SITE = "https://somaari.in";
const localArg = process.argv.indexOf("--local");
const local = localArg > 0 ? process.argv[localArg + 1] : null;

async function getFile(app, path, ref) {
  if (local && ref) return execFileSync("git", ["-C", resolve(local, app.repo), "show", `${ref}:${path}`], { maxBuffer: 1 << 26 });
  if (local) return readFileSync(resolve(local, app.repo, path));
  const url = `https://raw.githubusercontent.com/${app.owner ?? owner}/${app.repo}/${ref ?? "main"}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${app.repo}: ${path} not found on ${ref ?? "main"} (HTTP ${res.status}). Is the repo public?`);
  return Buffer.from(await res.arrayBuffer());
}

function fail(app, message) {
  throw new Error(`${app.repo}: ${message}`);
}

// Width and height of a PNG or JPEG, for the <img> attributes.
function imageSize(app, path, data) {
  if (data.readUInt32BE(0) === 0x89504e47) return [data.readUInt32BE(16), data.readUInt32BE(20)];
  if (data[0] === 0xff && data[1] === 0xd8) {
    for (let i = 2; i + 9 < data.length; i += 2 + data.readUInt16BE(i + 2)) {
      const marker = data[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [data.readUInt16BE(i + 7), data.readUInt16BE(i + 5)];
      }
    }
  }
  fail(app, `${path} is not a PNG or JPEG`);
}

// Downloads the detail page screenshot(s) and fills in the page's <figure class="detail-shot">, keeping
// its alt text. "screenshot" is one path, or { "<theme id>": path } per theme in theme.js: then the
// <img> is marked data-shots, has each theme's path in data-shot-<id> and shots.js sets src to the current
// theme's, so only that one is downloaded; a <noscript> copy shows the no-JS theme's without JS.
// Themes change in somaari-common alone, so the map may lag behind theme.js: a theme with no screenshot
// shows the default theme's (else the no-JS theme's, else any), and an entry for a theme theme.js no
// longer has is skipped. Both only warn, so a theme change never stops the deploy.
async function screenshots(app) {
  const perTheme = typeof app.screenshot === "object";
  const shots = perTheme ? { ...app.screenshot } : { [DEFAULT_THEME]: app.screenshot };
  const ids = Object.keys(THEMES);
  let fallback = DEFAULT_THEME;
  if (perTheme) {
    for (const id of Object.keys(shots)) {
      if (!THEMES[id]) {
        console.warn(`${app.repo}: "screenshot" has "${id}", which is not a theme in theme.js; skipped`);
        delete shots[id];
      }
    }
    fallback = [DEFAULT_THEME, NOJS_THEME].find((id) => shots[id]) ?? Object.keys(shots)[0];
    if (!fallback) fail(app, `"screenshot" names none of the themes in theme.js (${ids.join(", ")})`);
    const missing = ids.filter((id) => !shots[id]);
    if (missing.length) console.warn(`${app.repo}: no screenshot for ${missing.join(", ")}; shows the ${fallback} one`);
  }
  const pagePath = join(OUT, "apps", app.repo, "index.html");
  const html = readFileSync(pagePath, "utf8");
  const figure = html.match(/(<figure class="detail-shot">)[\s\S]*?(<\/figure>)/);
  const alt = figure?.[0].match(/\balt="([^"]*)"/)?.[1];
  if (!alt) fail(app, `apps/${app.repo}/index.html needs a <figure class="detail-shot"> with an <img alt="...">`);

  const dir = join(OUT, "assets", "apps", app.repo);
  mkdirSync(dir, { recursive: true });
  const urls = {};
  let size;
  for (const [theme, path] of Object.entries(shots)) {
    const data = await getFile(app, path);
    const [width, height] = imageSize(app, path, data);
    if (size && size !== `${width}x${height}`) fail(app, `the screenshots differ in size (${path} is ${width}x${height}, not ${size})`);
    size = `${width}x${height}`;
    const name = `screenshot${perTheme ? `-${theme}` : ""}${posix.extname(path)}`;
    writeFileSync(join(dir, name), data);
    urls[theme] = `/assets/apps/${app.repo}/${name}`;
  }
  const [width, height] = size.split("x");
  const attrs = `width="${width}" height="${height}" alt="${alt}"`;
  const img = perTheme
    ? `<img data-shots ${ids.map((id) => `data-shot-${id}="${urls[id] ?? urls[fallback]}"`).join(" ")} ${attrs}>\n      ` +
      `<noscript><img src="${urls[NOJS_THEME] ?? urls[fallback]}" ${attrs}></noscript>`
    : `<img src="${urls[DEFAULT_THEME]}" ${attrs}>`;
  writeFileSync(pagePath, html.replace(figure[0], `${figure[1]}\n      ${img}\n    ${figure[2]}`));
  return Object.keys(urls).length;
}

// Downloads the card's demo loop and poster into assets/demos/<repo>/. "demo": { "ref": "<branch>" } names
// the app repo branch that holds them at its root (somaari-plan's is written by its site-demo workflow).
async function demo(app) {
  const dir = join(OUT, "assets", "demos", app.repo);
  mkdirSync(dir, { recursive: true });
  for (const name of DEMO_FILES) {
    const data = await getFile(app, name, app.demo.ref);
    if (data.length > DEMO_MAX_BYTES) fail(app, `${name} on ${app.demo.ref} is over 1 MB; re-encode it`);
    writeFileSync(join(dir, name), data);
  }
}

// Downloads the files somaari-common's theme/files.json lists into /theme/ and reads the theme list from
// that theme.js. The pages load /theme/theme.js and /theme/themes.css; stampThemeVersions() versions them.
async function theme() {
  const { files } = JSON.parse((await getFile(COMMON, "theme/files.json")).toString("utf8"));
  for (const f of files) {
    mkdirSync(dirname(join(OUT, "theme", f)), { recursive: true });
    writeFileSync(join(OUT, "theme", f), await getFile(COMMON, `theme/${f}`));
  }
  ({ THEMES, DEFAULT_THEME } = createRequire(import.meta.url)(resolve(OUT, "theme", "theme.js")));
  const css = readFileSync(join(OUT, "theme", "themes.css"), "utf8");
  NOJS_THEME = css.match(/:root,\s*:root\[data-theme="([^"]+)"\]/)?.[1];
  if (!THEMES[NOJS_THEME]) throw new Error(`somaari-common: themes.css should start a theme block with ":root, :root[data-theme=\"<id>\"]" (the no-JS look)`);
  return files.length;
}

// Browsers may cache /theme/ files for hours (see scripts/asset-versions.mjs), so every page in dist/
// gets /theme/theme.js and /theme/themes.css as ?v=<first 10 hex of the file's sha256>. They are not in
// this repo, so asset-versions.mjs can't do it at commit time.
function stampThemeVersions() {
  const version = (f) => createHash("sha256").update(readFileSync(join(OUT, "theme", f))).digest("hex").slice(0, 10);
  const v = { "theme.js": version("theme.js"), "themes.css": version("themes.css") };
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html"));
  for (const page of pages) {
    const html = readFileSync(join(OUT, page), "utf8");
    writeFileSync(join(OUT, page), html.replace(/(["'])\/theme\/(theme\.js|themes\.css)\1/g, (_, q, f) => `${q}/theme/${f}?v=${v[f]}${q}`));
  }
}

// Reads somaari-common's apps/apps.json (from main, or the local checkout with --local).
async function manifest() {
  ({ github: owner, apps } = JSON.parse((await getFile(COMMON, "apps/apps.json")).toString("utf8")));
  for (const app of apps) {
    if (app.detail_page && !existsSync(join("apps", app.repo, "index.html"))) {
      fail(app, `apps.json says it has a detail page, but apps/${app.repo}/index.html is missing`);
    }
  }
  return apps.length;
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// An HTML comment holding manifest text as it is (the AI chip's source quotes the app's README).
function comment(app, text) {
  if (text.includes("--") || text.includes(">")) fail(app, `"--" or ">" can't go in an HTML comment: ${text}`);
  return `<!-- ${text} -->`;
}

// One landing page card. The demo poster is the committed assets/demos/<repo>/poster.webp, or the one
// demo() downloads; the player's walkthrough link comes from videos.json. The title links to the detail
// page; the actions are one Details button plus Guide (docs.somaari.in) and GitHub text links.
function card(app) {
  const t = escapeHtml(app.title);
  const repo = escapeHtml(app.repo);
  const video = VIDEOS[app.repo] ? `/apps/${repo}/#video` : "";
  const hasDemo = app.demo || existsSync(join("assets", "demos", app.repo, "poster.webp"));
  // trip's loop is made from screenshots by encode.sh alone; the others are recorded (scripts/demo/README.md).
  const rebuild = existsSync(join("scripts", "demo", app.repo, "encode.sh")) && !existsSync(join("scripts", "demo", app.repo, "record.sh"))
    ? `scripts/demo/${repo}/encode.sh` : "scripts/demo/README.md";
  const labels = [app.ai.label].flat();
  const actions = [
    app.detail_page && `<a class="btn" href="/apps/${repo}/">Details<span class="visually-hidden"> about ${t}</span></a>`,
    app.guide && `<a class="card-link" href="https://docs.somaari.in/${repo}/">Guide<span class="visually-hidden"> for ${t}</span></a>`,
    app.public && `<a class="card-link" href="https://github.com/${escapeHtml(owner)}/${repo}">GitHub<span class="visually-hidden"> (${repo})</span></a>`,
  ].filter(Boolean);
  const title = app.detail_page ? `<a href="/apps/${repo}/">${t}<span aria-hidden="true"> &rarr;</span></a>` : t;
  return `
        <!-- CARD START: ${repo} -->
        <li class="card">${hasDemo ? `
          <!-- Demo: a still poster; "Play demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: ${rebuild} -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/${repo}/poster.webp" ${POSTER} alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="${repo}" data-title="${t}"${video ? ` data-video="${video}"` : ""} hidden><span aria-hidden="true">&#x25B6;&#xFE0E;</span> Play demo<span class="visually-hidden">: ${t}</span></button>
          </div>` : ""}
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">${title}</h3>
              <p class="card-repo">${repo}</p>
            </div>
            ${comment(app, `AI chip: ${app.ai.source}`)}
            <span class="badges">
              <span class="badge badge--${app.status}">${STATUS[app.status]}</span>
${labels.map((l) => `              <span class="badge badge--ai">${escapeHtml(l)}</span>`).join("\n")}
            </span>
          </div>
          <p class="card-desc">${escapeHtml(app.description)}</p>
          <p class="card-tags">${app.tags.map(escapeHtml).join(" &middot; ")}</p>${actions.length ? `
          <div class="card-actions">
${actions.map((a) => `            ${a}`).join("\n")}
          </div>` : ""}${app.public ? "" : `
          <!-- Repo not public yet: no GitHub link. Set "public": true in apps.json when it is. -->`}
        </li>
        <!-- CARD END: ${repo} -->
`;
}

// Fills the landing page lists with the manifest's cards, in manifest order, and adds the apps with a
// detail page to the sitemap.
function cards() {
  const path = join(OUT, "index.html");
  let html = readFileSync(path, "utf8");
  for (const [list, statuses] of Object.entries(LISTS)) {
    const marker = new RegExp(`(<!-- APPS:${list} -->)[\\s\\S]*?(<!-- /APPS:${list} -->)`);
    if (!marker.test(html)) throw new Error(`index.html has no <!-- APPS:${list} --> ... <!-- /APPS:${list} --> markers`);
    const items = apps.filter((app) => statuses.includes(app.status)).map(card).join("");
    html = html.replace(marker, (_, start, end) => `${start}\n${items}\n        ${end}`);
  }
  writeFileSync(path, html);

  const sitemap = join(OUT, "sitemap.xml");
  const urls = apps.filter((app) => app.detail_page).map((app) => {
    const date = gitDate(join("apps", app.repo, "index.html"));
    return `  <url>\n    <loc>${SITE}/apps/${escapeHtml(app.repo)}/</loc>\n${date ? `    <lastmod>${date}</lastmod>\n` : ""}  </url>\n`;
  });
  const xml = readFileSync(sitemap, "utf8");
  if (!xml.includes("  <!-- APPS -->\n")) throw new Error("sitemap.xml has no <!-- APPS --> line");
  writeFileSync(sitemap, xml.replace("  <!-- APPS -->\n", urls.join("")));
  return apps.length;
}

// The date of the last commit that changed a file, or "" when git can't tell (a shallow clone).
function gitDate(path) {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", path], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

// The shared header, built from network.json: the logo (links to somaari.in), then the "main" and "lab"
// sites in network.json order (Apps, Docs, Book, Blog, Games), the current site marked aria-current. On
// phones nav.js turns the links into a drawer opened by the menu button; without JS they stay visible.
// Every page of this site is the "apps" site. Links to somaari.in itself are written relative.
const CURRENT_SITE = "apps";
function header() {
  const network = JSON.parse(readFileSync("network.json", "utf8"));
  const href = (url) => escapeHtml(url.startsWith(`${SITE}/`) ? url.slice(SITE.length) : url);
  const items = network.sites.map((s) => {
    const current = s.id === CURRENT_SITE ? ' aria-current="true"' : "";
    return `            <li><a href="${href(s.url)}"${current}>${escapeHtml(s.label)}</a></li>`;
  }).join("\n");
  const github = escapeHtml(network.social.github);
  const youtube = escapeHtml(network.social.youtube);
  const tile = (s) => `<li><a href="${href(s.url)}"${s.id === CURRENT_SITE ? ' aria-current="true"' : ""}><strong>${escapeHtml(s.label)}</strong> <span>${escapeHtml(s.description)}</span>${s.note ? ` <em>${escapeHtml(s.note)}</em>` : ""}</a></li>`;
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

// Replaces the SHARED HEADER block of every page in dist/ (404.html has its own) with header().
function headers() {
  const nav = createHash("sha256").update(readFileSync("nav.js")).digest("hex").slice(0, 10);
  const block = header().replace("NAVV", nav);
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"));
  let n = 0;
  for (const page of pages) {
    const html = readFileSync(join(OUT, page), "utf8");
    const re = /<!-- SHARED HEADER[\s\S]*?<!-- \/SHARED HEADER -->/;
    if (!re.test(html)) continue;
    writeFileSync(join(OUT, page), html.replace(re, () => block));
    n++;
  }
  return n;
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT);
  for (const f of PUBLISH) cpSync(f, join(OUT, f), { recursive: true });
  console.log(`themes: ${await theme()} files from somaari-common ${local ? "local copy" : COMMON.ref}`);
  console.log(`apps: ${await manifest()} in somaari-common apps/apps.json ${local ? "local copy" : COMMON.ref}`);

  for (const app of apps) {
    if (app.screenshot) console.log(`${app.repo}: ${await screenshots(app)} screenshot(s) from ${local ? "local copy" : "main"}`);
    if (app.demo) {
      await demo(app);
      console.log(`${app.repo}: demo loop from ${app.demo.ref}`);
    }
  }
  cards();
  console.log(`header: built from network.json into ${headers()} pages`);
  stampThemeVersions();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
