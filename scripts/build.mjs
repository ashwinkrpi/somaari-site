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
const PUBLISH = ["index.html", "404.html", "style.css", "shots.js", "demo.js", "video.js", "favicon.svg", "robots.txt",
  "sitemap.xml", "_headers", "_redirects", "apps", "assets", "about", "privacy", "terms"];
// The card demo files on an app's demo branch, and the most each may weigh.
const DEMO_FILES = ["loop.webm", "loop.mp4", "poster.webp"];
const DEMO_MAX_BYTES = 1024 * 1024;
// somaari-common is fetched before the manifest (which names the owner of the app repos) is read.
const COMMON = { repo: "somaari-common", ref: "main", owner: "ashwinkrpi" };
// Read from somaari-common's theme.js by theme().
let THEMES, DEFAULT_THEME;

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
// its alt text. "screenshot" is one path, or { "<theme id>": path } for every theme in theme.js: then the
// <img> is marked data-shots, has each theme's path in data-shot-<id> and shots.js sets src to the current
// theme's, so only that one is downloaded; a <noscript> copy shows the default theme's without JS.
async function screenshots(app) {
  const perTheme = typeof app.screenshot === "object";
  const shots = perTheme ? app.screenshot : { [DEFAULT_THEME]: app.screenshot };
  const ids = Object.keys(THEMES);
  if (perTheme && (ids.some((id) => !shots[id]) || Object.keys(shots).some((id) => !THEMES[id]))) {
    fail(app, `"screenshot" needs exactly one path per theme: ${ids.join(", ")}`);
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
    ? `<img data-shots ${ids.map((id) => `data-shot-${id}="${urls[id]}"`).join(" ")} ${attrs}>\n      ` +
      `<noscript><img src="${urls[DEFAULT_THEME]}" ${attrs}></noscript>`
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
  const video = VIDEOS[app.repo] ? `/apps/${app.repo}/#video` : "";
  const hasDemo = app.demo || existsSync(join("assets", "demos", app.repo, "poster.webp"));
  // trip's loop is made from screenshots by encode.sh alone; the others are recorded (scripts/demo/README.md).
  const rebuild = existsSync(join("scripts", "demo", app.repo, "encode.sh")) && !existsSync(join("scripts", "demo", app.repo, "record.sh"))
    ? `scripts/demo/${app.repo}/encode.sh` : "scripts/demo/README.md";
  const labels = [app.ai.label].flat();
  const actions = [
    app.detail_page && `<a class="btn" href="/apps/${app.repo}/">Details<span class="visually-hidden"> about ${t}</span></a>`,
    app.guide && `<a class="card-link" href="https://docs.somaari.in/${app.repo}/">Guide<span class="visually-hidden"> for ${t}</span></a>`,
    app.public && `<a class="card-link" href="https://github.com/${owner}/${app.repo}">GitHub<span class="visually-hidden"> (${app.repo})</span></a>`,
  ].filter(Boolean);
  const title = app.detail_page ? `<a href="/apps/${app.repo}/">${t}<span aria-hidden="true"> &rarr;</span></a>` : t;
  return `
        <!-- CARD START: ${app.repo} -->
        <li class="card">${hasDemo ? `
          <!-- Demo: a still poster; "Play demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: ${rebuild} -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/${app.repo}/poster.webp" ${POSTER} alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="${app.repo}" data-title="${t}"${video ? ` data-video="${video}"` : ""} hidden><span aria-hidden="true">&#x25B6;&#xFE0E;</span> Play demo<span class="visually-hidden">: ${t}</span></button>
          </div>` : ""}
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">${title}</h3>
              <p class="card-repo">${app.repo}</p>
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
        <!-- CARD END: ${app.repo} -->
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
    return `  <url>\n    <loc>${SITE}/apps/${app.repo}/</loc>\n${date ? `    <lastmod>${date}</lastmod>\n` : ""}  </url>\n`;
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
  stampThemeVersions();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
