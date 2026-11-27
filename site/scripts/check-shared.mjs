// Checks that every page carries the same header and footer as index.html (scripts/build.mjs rebuilds
// them from network.json; the copies between <!-- SHARED HEADER ... --> / <!-- /SHARED HEADER --> and the
// same for FOOTER keep the source pages viewable as they are).
// It also checks that every page, 404.html included, has the same look: the same favicon, the theme-color
// metas theme.js updates, and /theme/theme.js, /theme/themes.css, /shared.css and /style.css in that
// order, so every theme (seasonal ones too) colours every page the same way.
// Run from the repo root: node scripts/check-shared.mjs   (exits 1 if anything differs or is missing)
import { readFileSync, readdirSync } from "node:fs";

const block = (html, name) => html.match(new RegExp(`<!-- SHARED ${name}[\\s\\S]*?<!-- /SHARED ${name} -->`))?.[0];
const pages = ["index.html", ...readdirSync("apps").map((d) => `apps/${d}/index.html`),
  "about/index.html", "uses/index.html", "uses/iphone/index.html", "uses/raspberry-pi/index.html", "privacy/index.html", "terms/index.html", "search/index.html"];
const ref = readFileSync("index.html", "utf8");

// The head lines every page needs, in this order (?v= versions are ignored).
const HEAD = [
  '<meta name="theme-color" content="#FBC96B" media="(prefers-color-scheme: light)">',
  '<meta name="theme-color" content="#FBC96B" media="(prefers-color-scheme: dark)">',
  '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
  '<script src="/theme/theme.js"></script>',
  '<link rel="stylesheet" href="/theme/themes.css">',
  '<link rel="stylesheet" href="/shared.css">',
  '<link rel="stylesheet" href="/style.css">',
];

let bad = 0;
for (const page of pages.slice(1)) {
  const html = readFileSync(page, "utf8");
  for (const name of ["HEADER", "FOOTER"]) {
    if (block(html, name) === block(ref, name)) continue;
    console.error(`${page}: the shared ${name.toLowerCase()} differs from index.html (or is missing)`);
    bad++;
  }
}
for (const page of [...pages, "404.html"]) {
  const head = readFileSync(page, "utf8").replace(/\?v=[0-9a-f]*/g, "");
  let at = 0;
  for (const line of HEAD) {
    const i = head.indexOf(line, at);
    if (i < 0) {
      console.error(`${page}: ${head.includes(line) ? "out of order" : "missing"} in <head>: ${line}`);
      bad++;
      continue;
    }
    at = i + line.length;
  }
  if ((head.match(/<link rel="icon"/g) ?? []).length !== 1) {
    console.error(`${page}: needs exactly one <link rel="icon"> (/favicon.svg)`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log(`shared header, footer, favicon and stylesheets match on ${pages.length + 1} pages`);
