// Checks internal links in the source pages: every href/src that points at this site must resolve to a
// file in the repo, and a #fragment must match an id in the target page. /theme/ files are fetched from
// somaari-common at build time, so they are skipped, as are /assets/apps/ screenshots, which the build downloads from each app's repo, and /pagefind/, which npm run build generates. External (https:, mailto:) links are not checked.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";

const SKIP = new Set(["node_modules", "dist", "dist-baseline", ".git"]);
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) pages.push(p.split("\\").join("/"));
  }
})(".");

const cache = new Map();
const read = (f) => (cache.has(f) ? cache.get(f) : (cache.set(f, readFileSync(f, "utf8")), cache.get(f)));
const errors = [];

for (const page of pages) {
  const html = read(page);
  for (const [, , raw] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
    const url = raw.replace(/&amp;/g, "&");
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue;
    const [pathAndQuery, frag] = url.split("#");
    const path = pathAndQuery.split("?")[0];
    let target;
    if (!path) target = page;
    else {
      const abs = path.startsWith("/") ? path : posix.join(posix.dirname(page), path);
      const rel = posix.normalize(abs).replace(/^\/+/, "");
      if (rel.startsWith("theme/") || rel.startsWith("assets/apps/") || rel.startsWith("pagefind/")) continue;
      target = rel === "" || rel.endsWith("/") ? `${rel}index.html` : rel;
      if (!existsSync(target) && existsSync(`${rel}/index.html`)) target = `${rel}/index.html`;
      if (!existsSync(target)) {
        errors.push(`${page}: ${raw} -> ${target} does not exist`);
        continue;
      }
    }
    if (frag && target.endsWith(".html") && !read(target).includes(`id="${frag}"`)) {
      errors.push(`${page}: ${raw} -> no id="${frag}" in ${target}`);
    }
  }
}

for (const e of errors) console.error(e);
if (errors.length) process.exit(1);
console.log(`internal links ok (${pages.length} pages)`);
