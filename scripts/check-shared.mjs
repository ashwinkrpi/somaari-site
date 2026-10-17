// Checks that every page carries the same header and footer as index.html. There's no build step,
// so each page has its own copy between <!-- SHARED HEADER ... --> / <!-- /SHARED HEADER --> (and
// the same for FOOTER). After changing them in index.html, paste the new block into each page.
// Run from the repo root: node scripts/check-shared.mjs   (exits 1 if a copy differs or is missing)
import { readFileSync, readdirSync } from "node:fs";

const block = (html, name) => html.match(new RegExp(`<!-- SHARED ${name}[\\s\\S]*?<!-- /SHARED ${name} -->`))?.[0];
const pages = ["index.html", ...readdirSync("apps").map((d) => `apps/${d}/index.html`)];
const ref = readFileSync("index.html", "utf8");

let bad = 0;
for (const page of pages.slice(1)) {
  const html = readFileSync(page, "utf8");
  for (const name of ["HEADER", "FOOTER"]) {
    if (block(html, name) === block(ref, name)) continue;
    console.error(`${page}: the shared ${name.toLowerCase()} differs from index.html (or is missing)`);
    bad++;
  }
}
if (bad) process.exit(1);
console.log(`shared header and footer match on ${pages.length} pages`);
