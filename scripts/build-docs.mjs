// Builds the published site into dist/: copies the static files, then turns each app's guide (listed in
// docs.config.json) into /apps/<repo>/docs/. The guides are written only in the app repos; this script
// downloads them from GitHub on every build, so a docs push to an app repo plus a rebuild is all it takes.
// The same goes for an app's detail page screenshot ("screenshot") and card demo loop ("demo") when
// docs.config.json names them: they are downloaded into assets/ and never committed here.
// Run from the repo root: npm run build
// With --local <dir> it reads <dir>/<repo>/<src> instead of GitHub, to preview docs edits before pushing.
// Exits 1 (and Cloudflare keeps the current deploy) if a guide can't be fetched, mentions self-hosting,
// links to a missing anchor or uses an image from outside its folder.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, posix, resolve } from "node:path";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import GithubSlugger from "github-slugger";

const OUT = "dist";
// What gets published. Anything else in the repo (scripts/, README.md, package.json, ...) stays private.
const PUBLISH = ["index.html", "404.html", "style.css", "theme.js", "demo.js", "favicon.svg", "robots.txt",
  "sitemap.xml", "_headers", "apps", "assets"];
const SITE = "https://somaari.in";
// The site never mentions self-hosting (not every somaari app is self-hosted).
const BANNED = /self[- ]?host/i;
// The guides open with a banner image; the docs page has its own title instead.
const BANNER = /<img\b[^>]*\bsrc="[^"]*banner\.svg"[^>]*>|!\[[^\]]*\]\([^)]*banner\.svg\)/g;
// A guide can keep a section on GitHub only: <!-- site:skip --> ... <!-- /site:skip -->
const SKIP = /<!--\s*site:skip\s*-->[\s\S]*?<!--\s*\/site:skip\s*-->/g;
// The demo player's files, all three required on the app repo's "demo" branch.
const DEMO_FILES = ["loop.webm", "loop.mp4", "poster.webp"];
const DEMO_MAX_BYTES = 1024 * 1024;
const { THEMES, DEFAULT_THEME } = createRequire(import.meta.url)("../theme.js");
const ALERTS = { NOTE: "Note", TIP: "Tip", IMPORTANT: "Important", WARNING: "Warning", CAUTION: "Caution" };

const { owner, apps } = JSON.parse(readFileSync("docs.config.json", "utf8"));
const localArg = process.argv.indexOf("--local");
const local = localArg > 0 ? process.argv[localArg + 1] : null;

const githubUrl = (app, kind, path) => `https://github.com/${owner}/${app.repo}/${kind}/${app.ref}/${path}`;
// Every published guide, so links between guides (or to a guide on GitHub) stay on the site.
const published = new Map(apps.map((app) => [`${app.repo}:${app.src}`, `/apps/${app.repo}/docs/`]));
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decodeHtml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, "&");

// ref: a branch other than app.ref (with --local, read from that branch of the local clone).
async function getFile(app, path, ref) {
  if (local && ref) return execFileSync("git", ["-C", resolve(local, app.repo), "show", `${ref}:${path}`], { maxBuffer: 1 << 26 });
  if (local) return readFileSync(resolve(local, app.repo, path));
  const url = `https://raw.githubusercontent.com/${owner}/${app.repo}/${ref ?? app.ref}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${app.repo}: ${path} not found on ${ref ?? app.ref} (HTTP ${res.status}). Is the repo public?`);
  return Buffer.from(await res.arrayBuffer());
}

function fail(app, message) {
  throw new Error(`${app.repo}/${app.src}: ${message}`);
}

// Turns one guide into the HTML for the page body; returns it with the images it uses.
function render(app, markdown) {
  const docDir = posix.dirname(app.src);
  const slugger = new GithubSlugger();
  const images = new Map(); // repo path -> path relative to the docs page

  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      // GitHub's heading ids, so links written for GitHub (#-installation) work here too.
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = slugger.slug(decodeHtml(inner.replace(/<[^>]+>/g, "")));
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      // GitHub alerts: > [!NOTE] ...
      blockquote({ tokens }) {
        const body = this.parser.parse(tokens);
        const alert = body.match(/^<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
        if (!alert) return `<blockquote>\n${body}</blockquote>\n`;
        const rest = body.slice(alert[0].length).replace(/^<\/p>\s*/, "");
        const kind = alert[1].toLowerCase();
        return `<div class="callout callout--${kind}">\n<p class="callout-title">${ALERTS[alert[1]]}</p>\n` +
          `${rest.startsWith("<") ? rest : `<p>${rest}`}</div>\n`;
      },
    },
  });

  function rewriteLink(href = "") {
    if (href.startsWith("#")) return href;
    const onGithub = href.match(new RegExp(`^https://github\\.com/${owner}/([^/]+)/blob/[^/]+/([^#?]+)(#.*)?$`));
    if (onGithub) return published.has(`${onGithub[1]}:${onGithub[2]}`)
      ? published.get(`${onGithub[1]}:${onGithub[2]}`) + (onGithub[3] ?? "") : href;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("/")) return href;
    const [path, frag = ""] = href.split(/(?=#)/);
    const target = posix.normalize(posix.join(docDir, decodeURI(path)));
    if (target.startsWith("..")) fail(app, `link outside the repo: ${href}`);
    const key = `${app.repo}:${target}`;
    if (published.has(key)) return published.get(key) + frag;
    return encodeURI(githubUrl(app, "blob", target)) + frag;
  }

  function rewriteImage(src = "") {
    if (/^[a-z][a-z0-9+.-]*:|^\//i.test(src)) fail(app, `image from outside the repo: ${src} (the site only serves its own images)`);
    const target = posix.normalize(posix.join(docDir, decodeURI(src)));
    const rel = posix.relative(docDir, target);
    if (rel.startsWith("..")) fail(app, `image outside ${docDir}/: ${src}`);
    images.set(target, rel);
    return encodeURI(rel);
  }

  const raw = marked.parse(markdown.replace(SKIP, "").replace(BANNER, ""))
    .replace(/<table>/g, '<div class="doc-table"><table>').replace(/<\/table>/g, "</table></div>");

  const html = sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "details", "summary", "kbd", "h1", "h2", "del", "input"]),
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height", "title"],
      h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      th: ["align"], td: ["align"],
      ol: ["start"],
      details: ["open"],
      input: ["type", "checked", "disabled"],
    },
    allowedClasses: {
      code: ["language-*"],
      div: ["doc-center", "doc-table", "callout", "callout--*"],
      p: ["callout-title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, href: rewriteLink(attribs.href) } }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, src: rewriteImage(attribs.src) } }),
      div: (tagName, attribs) => ({ tagName,
        attribs: attribs.align === "center" ? { ...attribs, class: `${attribs.class ?? ""} doc-center`.trim() } : attribs }),
    },
  });

  const ids = new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => decodeHtml(m[1])));
  for (const [, frag] of html.matchAll(/\shref="#([^"]*)"/g)) {
    if (!ids.has(decodeURIComponent(decodeHtml(frag)))) fail(app, `link to a missing heading: #${frag}`);
  }
  const banned = decodeHtml(html.replace(/<[^>]+>/g, " ")).match(BANNED) ?? html.match(BANNED);
  if (banned) fail(app, `mentions self-hosting ("${banned[0]}"); reword it in the app repo`);
  return { html, images };
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
// <img> has each theme's path in data-shot-<id> and theme.js sets src to the current theme's, so only
// that one is downloaded; a <noscript> copy shows the default theme's without JS.
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
    ? `<img ${ids.map((id) => `data-shot-${id}="${urls[id]}"`).join(" ")} ${attrs}>\n      ` +
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

// The docs page reuses the app's detail page for its head, header and footer.
function page(app, html) {
  const detailPath = join(OUT, "apps", app.repo, "index.html");
  let shell;
  try { shell = readFileSync(detailPath, "utf8"); } catch { fail(app, `no detail page at apps/${app.repo}/index.html; add that first`); }
  const name = shell.match(/<h1 class="detail-title">([^<]+)<\/h1>/)?.[1] ?? app.repo;
  const title = `${name} guide (${app.repo}) – Somaari`;
  const description = `How to install, set up and use ${name} (${app.repo}).`;
  const url = `${SITE}/apps/${app.repo}/docs/`;
  const source = githubUrl(app, "blob", app.src);

  const replace = (pattern, value) => {
    if (!pattern.test(shell)) fail(app, `the detail page has no ${pattern}; update build-docs.mjs to match it`);
    shell = shell.replace(pattern, value);
  };
  replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  replace(/(<meta name="description" content=")[^"]*/, `$1${escapeHtml(description)}`);
  replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`);
  replace(/(<meta property="og:title" content=")[^"]*/, `$1${escapeHtml(title)}`);
  replace(/(<meta property="og:description" content=")[^"]*/, `$1${escapeHtml(description)}`);
  replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`);
  replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${escapeHtml(title)}`);
  replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${escapeHtml(description)}`);
  replace(/<main[\s\S]*<\/main>/, `<main id="main" class="detail docs container">
    <p class="detail-back"><a href="/apps/${app.repo}/">&larr; ${name}</a></p>

    <!-- Built by scripts/build-docs.mjs from ${app.repo}/${app.src}. Edit the guide there, not here. -->
    <div class="detail-intro">
      <div class="card-names">
        <h1 class="detail-title">${name} guide</h1>
        <p class="card-repo">${app.repo}</p>
      </div>
      <p class="detail-note">This guide is kept in the ${app.repo} repository on GitHub. <a href="${source}">View it on GitHub</a></p>
    </div>

    <article class="prose">
${html}
    </article>
  </main>`);
  return shell;
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT);
  for (const f of PUBLISH) cpSync(f, join(OUT, f), { recursive: true });

  const urls = [];
  for (const app of apps) {
    if (app.screenshot) console.log(`${app.repo}: ${await screenshots(app)} screenshot(s) from ${local ? "local copy" : app.ref}`);
    if (app.demo) {
      await demo(app);
      console.log(`${app.repo}: demo loop from ${app.demo.ref}`);
    }
    const { html, images } = render(app, (await getFile(app, app.src)).toString("utf8"));
    const dir = join(OUT, "apps", app.repo, "docs");
    mkdirSync(dir, { recursive: true });
    for (const [path, rel] of images) {
      const data = await getFile(app, path);
      if (path.endsWith(".svg") && BANNED.test(data.toString("utf8"))) fail(app, `${path} mentions self-hosting`);
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), data);
    }
    writeFileSync(join(dir, "index.html"), page(app, html));
    urls.push(`${SITE}/apps/${app.repo}/docs/`);
    console.log(`${app.repo}: /apps/${app.repo}/docs/ (${images.size} images) from ${local ? "local copy" : app.ref}`);
  }

  const sitemap = join(OUT, "sitemap.xml");
  writeFileSync(sitemap, readFileSync(sitemap, "utf8").replace("</urlset>",
    urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>\n`).join("") + "</urlset>"));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
