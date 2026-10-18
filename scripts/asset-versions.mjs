// Cache-busts the site's CSS and JS: rewrites /style.css, /theme.js and /demo.js in every HTML page
// (index.html, 404.html, apps/*/index.html, ...) to /<file>?v=<first 10 hex of its sha256>. Browsers may cache these files for hours, so a changed
// file must get a new URL or visitors see new HTML with an old stylesheet.
// Run from the repo root after editing any of them: node scripts/asset-versions.mjs
// With --check it changes nothing and exits 1 if any version is stale.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const ASSETS = ["style.css", "theme.js", "demo.js"];
// Every .html file in the source tree; scripts/, node_modules/, dist/ (build output) and dot-folders hold no pages.
const PAGES = readdirSync(".", { recursive: true })
  .filter((f) => f.endsWith(".html") && !/^(scripts|node_modules|dist|\.)|\/\./.test(f))
  .sort();
const check = process.argv.includes("--check");

const version = Object.fromEntries(ASSETS.map((f) =>
  [f, createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 10)]));

let stale = 0;
for (const page of PAGES) {
  const html = readFileSync(page, "utf8");
  const out = html.replace(/(["'])\/(style\.css|theme\.js|demo\.js)(\?v=[0-9a-f]*)?\1/g,
    (_, q, file) => `${q}/${file}?v=${version[file]}${q}`);
  if (out === html) continue;
  stale++;
  if (check) console.error(`${page}: asset versions are out of date`);
  else { writeFileSync(page, out); console.log(`${page}: updated`); }
}
if (check && stale) {
  console.error("Run: node scripts/asset-versions.mjs");
  process.exit(1);
}
if (!stale) console.log("asset versions are up to date");
