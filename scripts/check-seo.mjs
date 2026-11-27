// Checks that every page has a non-empty <title>, meta description, canonical URL and OG image.
// The source pages must carry the title and description (and a canonical URL, except noindex pages such as
// 404.html). The OG image is added by scripts/build.mjs, so it is checked in the built copy under dist/
// (the og:image URL must be on https://somaari.in/ and its file must exist in dist/og/); when dist/ has not
// been built yet that part is skipped with a note.
// Run from the repo root: node scripts/check-seo.mjs   (exits 1 if anything is missing)
import { existsSync, readFileSync, readdirSync } from "node:fs";

const SITE = "https://somaari.in";
const pages = ["index.html", ...readdirSync("apps").map((d) => `apps/${d}/index.html`),
  "about/index.html", "uses/index.html", "uses/iphone/index.html", "uses/raspberry-pi/index.html", "privacy/index.html", "terms/index.html", "search/index.html", "404.html"];
const noindex = (html) => /<meta name="robots" content="noindex/.test(html);
const content = (html, re) => html.match(re)?.[1]?.trim();

let bad = 0;
const fail = (page, msg) => { console.error(`${page}: ${msg}`); bad++; };

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  if (!content(html, /<title>([^<]*)<\/title>/)) fail(page, "missing or empty <title>");
  if (!content(html, /<meta name="description" content="([^"]*)"/)) fail(page, "missing or empty meta description");
  if (noindex(html)) continue;
  const canonical = content(html, /<link rel="canonical" href="([^"]*)"/);
  const want = `${SITE}/${page === "index.html" ? "" : page.replace(/index\.html$/, "")}`;
  if (!canonical) fail(page, "missing canonical URL");
  else if (canonical !== want) fail(page, `canonical is ${canonical}, expected ${want}`);
}

let ogChecked = 0;
if (existsSync("dist")) {
  for (const page of pages) {
    const path = `dist/${page}`;
    if (!existsSync(path)) { fail(path, "not built"); continue; }
    const html = readFileSync(path, "utf8");
    if (noindex(html)) continue;
    const image = content(html, /<meta property="og:image" content="([^"]*)"/);
    if (!image) fail(path, "missing og:image");
    else if (!image.startsWith(`${SITE}/`)) fail(path, `og:image is not on ${SITE}: ${image}`);
    else if (!existsSync(`dist/${image.slice(SITE.length + 1).split(/[?#]/)[0]}`)) fail(path, `og:image file is missing from dist/: ${image}`);
    else ogChecked++;
  }
}

if (bad) process.exit(1);
console.log(`title, description and canonical URL present on ${pages.length} pages; ` +
  (existsSync("dist") ? `og:image present on ${ogChecked} built pages` : "og:image not checked (run npm run build first)"));
