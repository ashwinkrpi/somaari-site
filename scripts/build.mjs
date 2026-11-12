// Builds the published site into dist/: copies the static files, then downloads what isn't kept here.
// The themes (theme.js, themes.css, fonts) come from somaari-common's theme/ into /theme/. An app's
// detail page screenshot ("screenshot") and card demo loop ("demo") come from the app repo when
// docs.config.json names them, into assets/; they are never committed here.
// The app guides are not built here: docs.somaari.in (the somaari-docs repo) publishes them, and
// _redirects sends the old /apps/<repo>/docs/ URLs there.
// Run from the repo root: npm run build
// With --local <dir> it reads <dir>/<repo>/... instead of GitHub (somaari-common too: <dir>/somaari-common/theme/).
// Exits 1 (and Cloudflare keeps the current deploy) if a file can't be fetched or a screenshot or demo
// doesn't fit.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve } from "node:path";

const OUT = "dist";
// Top-level files and folders copied to dist/ as they are.
const PUBLISH = ["index.html", "404.html", "style.css", "shots.js", "demo.js", "video.js", "favicon.svg", "robots.txt",
  "sitemap.xml", "_headers", "_redirects", "apps", "assets", "about", "privacy", "terms"];
// The card demo files on an app's demo branch, and the most each may weigh.
const DEMO_FILES = ["loop.webm", "loop.mp4", "poster.webp"];
const DEMO_MAX_BYTES = 1024 * 1024;
const COMMON = { repo: "somaari-common", ref: "main" };
// Read from somaari-common's theme.js by theme().
let THEMES, DEFAULT_THEME;

const { owner, apps } = JSON.parse(readFileSync("docs.config.json", "utf8"));
const localArg = process.argv.indexOf("--local");
const local = localArg > 0 ? process.argv[localArg + 1] : null;

async function getFile(app, path, ref) {
  if (local && ref) return execFileSync("git", ["-C", resolve(local, app.repo), "show", `${ref}:${path}`], { maxBuffer: 1 << 26 });
  if (local) return readFileSync(resolve(local, app.repo, path));
  const url = `https://raw.githubusercontent.com/${owner}/${app.repo}/${ref ?? app.ref}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${app.repo}: ${path} not found on ${ref ?? app.ref} (HTTP ${res.status}). Is the repo public?`);
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

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT);
  for (const f of PUBLISH) cpSync(f, join(OUT, f), { recursive: true });
  console.log(`themes: ${await theme()} files from somaari-common ${local ? "local copy" : COMMON.ref}`);

  for (const app of apps) {
    if (app.screenshot) console.log(`${app.repo}: ${await screenshots(app)} screenshot(s) from ${local ? "local copy" : app.ref}`);
    if (app.demo) {
      await demo(app);
      console.log(`${app.repo}: demo loop from ${app.demo.ref}`);
    }
  }
  stampThemeVersions();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
