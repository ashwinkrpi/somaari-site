// Builds the published site into dist/: copies the static files, then downloads what isn't kept here.
// The themes (theme.js, themes.css, fonts) come from somaari-common's theme/ into /theme/. The list of
// apps comes from somaari-common's apps/apps.json (the app manifest): the build writes the landing page
// cards and the sitemap's /apps/<repo>/ entries from it. An app's detail page screenshot ("screenshot")
// and card demo loop ("demo") come from the app repo when the manifest names them, into assets/; they
// are never committed here.
// The landing page's "Explore Somaari" row is built from network.json and the other sites' rss.xml and
// stats.json (scripts/explore.mjs); a tile whose source is unreachable falls back to plain text.
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
import { blogCards, explore } from "./explore.mjs";
import { SITE, escapeHtml, footer, header, jsonLd, organization, softwareApplication, website } from "./partials.mjs";

const OUT = "dist";
// Top-level files and folders copied to dist/ as they are.
const PUBLISH = ["index.html", "404.html", "shared.css", "style.css", "shots.js", "demo.js", "video.js", "nav.js", "favicon.svg", "robots.txt",
  "sitemap.xml", "network.json", "_headers", "_redirects", "apps", "assets", "about", "privacy", "terms", "search", "search.js"];
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
// An app whose repo is not public yet links to the blog's Somaari tag instead ("Follow progress").
const FOLLOW_URL = new URL("tags/somaari/", JSON.parse(readFileSync("network.json", "utf8")).sites.find((s) => s.id === "blog").url).href;
const STATUS = { live: "Available", dev: "In development", soon: "Coming soon" };
// The landing page lists: <!-- APPS:live --> ... <!-- /APPS:live --> and the same for dev ("soon" apps
// go in the dev list too).
const LISTS = { live: ["live"], dev: ["dev", "soon"] };
// Every card's demo poster is 720x406 (scripts/demo/README.md).
const POSTER = 'width="720" height="406"';
// Card screenshot thumbnails (set by screenshots()) and latest releases (set by releases()), by repo.
const THUMBS = {};
const RELEASES = {};
// An app's "platforms" in the manifest: ids from here.
const PLATFORMS = { pi: "Raspberry Pi", linux: "Linux", windows: "Windows" };
const RELEASE_CACHE = join(".cache", "releases.json");
const localArg =process.argv.indexOf("--local");
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
  THUMBS[app.repo] = { src: urls[DEFAULT_THEME] ?? urls[fallback], width, height };
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

// Adds <link rel="preload" as="font"> for the fonts the no-JS theme (the :root block of themes.css) uses
// for text and headings, before the stylesheet link on every page, so they download in parallel with the CSS.
// Other themes' fonts still load on demand. Returns the number of fonts preloaded.
function preloadFonts() {
  const css = readFileSync(join(OUT, "theme", "themes.css"), "utf8");
  const root = css.match(/:root,\s*:root\[data-theme="[^"]+"\]\s*\{([^}]*)\}/)?.[1] ?? "";
  const families = ["--font", "--font-display"].map((v) => root.match(new RegExp(`${v}:\\s*"([^"]+)"`))?.[1]).filter(Boolean);
  const files = [...new Set(families.map((family) => {
    const face = css.split("@font-face").find((b) => b.includes(`font-family: "${family}"`));
    return face?.match(/url\("([^"]+\.woff2)"\)/)?.[1];
  }).filter(Boolean))];
  if (!files.length) return 0;
  const links = files.map((f) => `<link rel="preload" href="/theme/${f}" as="font" type="font/woff2" crossorigin>`).join("\n  ");
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"));
  for (const page of pages) {
    const html = readFileSync(join(OUT, page), "utf8");
    const tag = '<link rel="stylesheet" href="/theme/themes.css';
    if (!html.includes(tag)) continue;
    writeFileSync(join(OUT, page), html.replace(tag, () => `${links}\n  ${tag}`));
  }
  return files.length;
}

// Converts the PNG and JPEG images under dist/assets/ to WebP with ffmpeg (when it is installed; else the
// originals stay and a warning is printed), keeps a WebP only if it is smaller, and points every page in
// dist/ at it. The sources in the repo and in the app repos are not touched.
function convertImages() {
  const assets = join(OUT, "assets");
  const images = readdirSync(assets, { recursive: true }).filter((f) => /\.(png|jpe?g)$/i.test(f));
  const swaps = [];
  for (const rel of images) {
    const from = join(assets, rel);
    const to = from.replace(/\.(png|jpe?g)$/i, ".webp");
    try {
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", from, "-quality", "80", to], { stdio: "ignore" });
    } catch {
      console.warn("images: ffmpeg is not available (or failed); images stay PNG/JPEG");
      return 0;
    }
    if (readFileSync(to).length >= readFileSync(from).length) { rmSync(to); continue; }
    rmSync(from);
    swaps.push([`/assets/${rel.split("\\").join("/")}`, `/assets/${rel.split("\\").join("/").replace(/\.(png|jpe?g)$/i, ".webp")}`]);
  }
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"));
  for (const page of pages) {
    let html = readFileSync(join(OUT, page), "utf8");
    const before = html;
    for (const [a, b] of swaps) html = html.split(a).join(b);
    if (html !== before) writeFileSync(join(OUT, page), html);
  }
  return swaps.length;
}

// Marks each page's <main> with data-pagefind-body so Pagefind (run after this script by npm run build)
// indexes only page content, not the shared header and footer. 404.html and the search page are left out.
function searchable() {
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"))
    .filter((f) => f !== "404.html" && !f.startsWith("search"));
  let n = 0;
  for (const page of pages) {
    const html = readFileSync(join(OUT, page), "utf8");
    if (!/<main\b/.test(html) || html.includes("data-pagefind-body")) continue;
    writeFileSync(join(OUT, page), html.replace(/<main\b/, "<main data-pagefind-body"));
    n++;
  }
  return n;
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

// An HTML comment holding manifest text as it is (the AI chip's source quotes the app's README).
function comment(app, text) {
  if (text.includes("--") || text.includes(">")) fail(app, `"--" or ">" can't go in an HTML comment: ${text}`);
  return `<!-- ${text} -->`;
}

// Latest GitHub release (tag and date) per public app, cached in .cache/releases.json. Offline (or with
// --local, or an API error) it uses the cache, else the card simply shows no version. Never fails the build.
async function releases() {
  let cache = {};
  try { cache = JSON.parse(readFileSync(RELEASE_CACHE, "utf8")); } catch { /* no cache yet */ }
  let fetched = 0;
  if (!local) {
    for (const app of apps.filter((a) => a.public)) {
      try {
        const res = await fetch(`https://api.github.com/repos/${app.owner ?? owner}/${app.repo}/releases/latest`,
          { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        const r = await res.json();
        if (r.tag_name && r.published_at) {
          cache[app.repo] = { tag: r.tag_name, date: r.published_at.slice(0, 10) };
          fetched++;
        }
      } catch { break; } // offline: stop trying
    }
    if (fetched) {
      mkdirSync(dirname(RELEASE_CACHE), { recursive: true });
      writeFileSync(RELEASE_CACHE, JSON.stringify(cache, null, 2) + "\n");
    }
  }
  for (const app of apps) if (cache[app.repo]) RELEASES[app.repo] = cache[app.repo];
  return [fetched, Object.keys(RELEASES).length];
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
    !app.public && `<a class="card-link" href="${escapeHtml(FOLLOW_URL)}">Follow progress<span class="visually-hidden"> on ${t} (blog)</span></a>`,
  ].filter(Boolean);
  const platforms = (app.platforms ?? []).filter((p) => PLATFORMS[p]);
  const rel = RELEASES[app.repo];
  const thumb = THUMBS[app.repo];
  const meta = platforms.length || rel ? `
          <p class="card-meta">${platforms.map((p) => `<span class="badge badge--platform">${PLATFORMS[p]}</span>`).join(" ")}${rel ? `${platforms.length ? " " : ""}<span class="card-release">${escapeHtml(rel.tag)} &middot; <time datetime="${rel.date}">${rel.date}</time></span>` : ""}</p>` : "";
  const title = app.detail_page ?`<a href="/apps/${repo}/">${t}<span aria-hidden="true"> &rarr;</span></a>` : t;
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
${meta}${thumb ? `
          <img class="card-thumb" src="${thumb.src}" width="${thumb.width}" height="${thumb.height}" alt="" loading="lazy">` : ""}
          <p class="card-desc">${escapeHtml(app.description)}</p>
          <p class="card-tags">${app.tags.map(escapeHtml).join(" &middot; ")}</p>${actions.length ? `
          <div class="card-actions">
${actions.map((a) => `            ${a}`).join("\n")}
          </div>` : ""}${app.public ? "" : `
          <!-- Repo not public yet: "Follow progress" links to the blog instead of GitHub. Set "public": true in apps.json when it is. -->`}
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

// Every page of this site is the "apps" site (see scripts/partials.mjs for the header and footer).
const CURRENT_SITE = "apps";

// Replaces the SHARED HEADER block of every page in dist/ (404.html has its own) with header(), built from
// network.json with this site marked current.
function headers() {
  const nav = createHash("sha256").update(readFileSync("nav.js")).digest("hex").slice(0, 10);
  const block = header(JSON.parse(readFileSync("network.json", "utf8")), CURRENT_SITE).replace("NAVV", nav);
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

// Replaces the SHARED FOOTER block of every page in dist/ with footer(), and fills the About page's
// <!-- AUTHOR --> ... <!-- /AUTHOR --> line with the author from network.json.
function footers() {
  const network = JSON.parse(readFileSync("network.json", "utf8"));
  const block = footer(network);
  const author = network.author;
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"));
  let n = 0;
  for (const page of pages) {
    let html = readFileSync(join(OUT, page), "utf8");
    const re = /<!-- SHARED FOOTER[\s\S]*?<!-- \/SHARED FOOTER -->/;
    if (!re.test(html)) continue;
    html = html.replace(re, () => block)
      .replace(/(<!-- AUTHOR -->)[\s\S]*?(<!-- \/AUTHOR -->)/, (_, a, b) => `${a}Built by ${escapeHtml(author)}${b}`);
    writeFileSync(join(OUT, page), html);
    n++;
  }
  return n;
}

// Fills the landing page's <!-- EXPLORE --> ... <!-- /EXPLORE --> list with a tile per Somaari site
// (scripts/explore.mjs). An unreachable source only turns its tile into plain text; it never stops the build.
async function exploreRow() {
  const path = join(OUT, "index.html");
  const html = readFileSync(path, "utf8");
  const marker = /(<!-- EXPLORE -->)[\s\S]*?(<!-- \/EXPLORE -->)/;
  if (!marker.test(html)) throw new Error("index.html has no <!-- EXPLORE --> ... <!-- /EXPLORE --> markers");
  const row = await explore(JSON.parse(readFileSync("network.json", "utf8")), CURRENT_SITE);
  writeFileSync(path, html.replace(marker, (_, start, end) => `${start}${row.html}${end}`));
  return row;
}

// Replaces the blog blurb between <!-- BLOGPOSTS ... --> and <!-- /BLOGPOSTS --> with 3 post cards; if
// rss.xml is unreachable the blurb stays.
async function blogPosts() {
  const path = join(OUT, "index.html");
  const html = readFileSync(path, "utf8");
  const marker = /(<!-- BLOGPOSTS[^>]*-->)[\s\S]*?(<!-- \/BLOGPOSTS -->)/;
  if (!marker.test(html)) throw new Error("index.html has no <!-- BLOGPOSTS --> ... <!-- /BLOGPOSTS --> markers");
  const cardsHtml = await blogCards(JSON.parse(readFileSync("network.json", "utf8")));
  if (cardsHtml) writeFileSync(path, html.replace(marker, (_, start, end) => `${start}${cardsHtml}${end}`));
  return Boolean(cardsHtml);
}

// Wraps text into lines of at most `max` characters (a single longer word stays whole).
function wrap(text, max, maxLines) {
  const lines = [];
  for (const word of text.split(/\s+/)) {
    if (lines.length && (lines.at(-1) + " " + word).length <= max) lines[lines.length - 1] += " " + word;
    else lines.push(word);
  }
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[\s.,;:]*\S*$/, "") + "…";
  }
  return lines;
}

// Makes a 1200x630 OG image per indexable page (site name and page title on the Warm Tactile / rangoli
// palette) with rsvg-convert, into dist/og/, and adds og:image and the Twitter card tags to the page's
// <head> (plus a canonical URL and Twitter title/description when the page lacks them). Pages marked
// noindex (404) are skipped. Without rsvg-convert it warns and leaves the pages as they are.
function ogImages() {
  const pages = readdirSync(OUT, { recursive: true }).filter((f) => f.endsWith(".html") && !f.startsWith("theme"));
  mkdirSync(join(OUT, "og"), { recursive: true });
  let n = 0;
  for (const page of pages) {
    const path = join(OUT, page);
    let html = readFileSync(path, "utf8");
    if (/<meta name="robots" content="noindex/.test(html)) continue;
    const dir = posix.dirname(page.split("\\").join("/"));
    const slug = dir === "." ? "home" : dir.replace(/\//g, "-");
    const url = `${SITE}${dir === "." ? "/" : `/${dir}/`}`;
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "Somaari";
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    // "Page – Somaari" shows "Page"; the home title "Somaari – Tagline" shows the tagline.
    const heading = title.replace(/\s+[–·-]\s+Somaari$/, "").replace(/^Somaari\s+[–·-]\s+/, "");
    const lines = wrap(heading.replace(/&amp;/g, "&").replace(/&#?\w+;/g, ""), 26, 3);
    const tspans = lines.map((l, i) => `<tspan x="80" dy="${i ? 84 : 0}">${escapeHtml(l)}</tspan>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#fbc96b"/>
<rect x="48" y="48" width="1104" height="534" rx="28" fill="#fff6e5" stroke="#e39a2d" stroke-width="3"/>
<text x="80" y="140" font-family="Marcellus, Georgia, serif" font-size="44" letter-spacing="2" fill="#2b2f8f">Somaari</text>
<text x="80" y="290" font-family="Marcellus, Georgia, serif" font-size="72" fill="#1c1640">${tspans}</text>
<rect x="80" y="520" width="120" height="8" rx="4" fill="#2b2f8f"/>
<text x="1120" y="530" text-anchor="end" font-family="Hanken Grotesk, Arial, sans-serif" font-size="28" fill="#3a3366">somaari.in</text>
</svg>`;
    const file = `og/${slug}.png`;
    try {
      execFileSync("rsvg-convert", ["-o", join(OUT, file)], { input: svg, stdio: ["pipe", "ignore", "ignore"] });
    } catch {
      console.warn("og: rsvg-convert is not available (or failed); no OG images");
      return 0;
    }
    const image = `${SITE}/${file}`;
    const alt = escapeHtml(`Somaari: ${heading.replace(/&amp;/g, "&")}`);
    const metaDesc = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? description;
    const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? title;
    html = html.replace(/\n?\s*<meta name="twitter:card"[^>]*>/g, "");
    const add = [
      !/rel="canonical"/.test(html) && `<link rel="canonical" href="${url}">`,
      !/property="og:title"/.test(html) && `<meta property="og:title" content="${ogTitle}">`,
      !/property="og:description"/.test(html) && `<meta property="og:description" content="${metaDesc}">`,
      !/property="og:url"/.test(html) && `<meta property="og:url" content="${url}">`,
      !/property="og:type"/.test(html) && `<meta property="og:type" content="website">`,
      !/property="og:site_name"/.test(html) && `<meta property="og:site_name" content="Somaari">`,
      `<meta property="og:image" content="${image}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${alt}">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      !/name="twitter:title"/.test(html) && `<meta name="twitter:title" content="${ogTitle}">`,
      !/name="twitter:description"/.test(html) && `<meta name="twitter:description" content="${metaDesc}">`,
      `<meta name="twitter:image" content="${image}">`,
      `<meta name="twitter:image:alt" content="${alt}">`,
    ].filter(Boolean).map((t) => `  ${t}`).join("\n");
    html = html.replace("</head>", () => `${add}\n</head>`);
    writeFileSync(path, html);
    n++;
  }
  return n;
}

// Adds JSON-LD to the <head> of the homepage (Organization and WebSite) and of each app detail page
// (SoftwareApplication, from the manifest's name, description, platforms and public repo). Returns the pages changed.
function structuredData() {
  const network = JSON.parse(readFileSync("network.json", "utf8"));
  const addToHead = (page, blocks) => {
    const path = join(OUT, page);
    const html = readFileSync(path, "utf8");
    writeFileSync(path, html.replace("</head>", () => `${blocks.join("\n  ")}\n</head>`));
  };
  addToHead("index.html", [jsonLd(organization(network)), jsonLd(website(network))]);
  let n = 1;
  for (const app of apps.filter((a) => a.detail_page)) {
    const url = `${SITE}/apps/${app.repo}/`;
    const operatingSystems = (app.platforms ?? []).filter((p) => PLATFORMS[p]).map((p) => PLATFORMS[p]);
    const data = softwareApplication({
      name: app.title,
      description: app.description,
      url,
      operatingSystems,
      codeRepository: app.public ? `https://github.com/${app.owner ?? owner}/${app.repo}` : undefined,
    });
    addToHead(join("apps", app.repo, "index.html"), [jsonLd(data)]);
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
  const [fresh, known] = await releases();
  console.log(`releases: ${fresh} fetched, ${known} shown${fresh || local ? "" : " (offline or none; cache used)"}`);
  cards();
  const row = await exploreRow();
  console.log(`explore: ${row.total} tiles, ${row.live} with live data`);
  console.log(`blog posts: ${(await blogPosts()) ? "3 cards from rss.xml" : "rss.xml unreachable; blurb kept"}`);
  console.log(`header: built from network.json into ${headers()} pages`);
  console.log(`footer: built from network.json into ${footers()} pages`);
  console.log(`og: ${ogImages()} images and meta tags`);
  console.log(`json-ld: ${structuredData()} pages (Organization, WebSite, SoftwareApplication)`);
  console.log(`images:${convertImages()} converted to WebP`);
  console.log(`fonts: ${preloadFonts()} preloaded`);
  console.log(`search: ${searchable()} pages marked for Pagefind`);
  stampThemeVersions();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
