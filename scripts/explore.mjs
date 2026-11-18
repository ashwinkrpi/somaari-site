// The landing page's "Explore Somaari" row: one tile per site in network.json (except this one), built at
// build time by scripts/build.mjs between <!-- EXPLORE --> and <!-- /EXPLORE --> in index.html.
//
//   docs   "Guides for N apps"                            N = the apps in network.json
//   book   "Volume 1 · free · N chapters"                 <book url>/stats.json: { "chapters": N or [...] }
//   blog   the titles of the latest 3 posts               <blog url>/rss.xml
//   games  "Genshin <version> · N videos · refreshed Sundays"
//                                                         <games url>/stats.json: { "genshin_version", "videos": N or [...] }
//
// Every download has a timeout and is caught: an unreachable or unexpected source only turns its tile into
// plain text (the site's description from network.json). This never throws, so the build never stops here.
import { escapeHtml } from "./partials.mjs";

const TIMEOUT_MS = 8000;
const SITE = "https://somaari.in";
const href = (url) => escapeHtml(url.startsWith(`${SITE}/`) ? url.slice(SITE.length) : url);

async function getText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

const count = (v) => (Array.isArray(v) ? v.length : Number.isInteger(v) && v >= 0 ? v : null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function decodeXml(s) {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").trim();
}

// Each returns the tile's live lines ({ text, url? }[]), or throws when the source can't be used.
const LIVE = {
  async docs(_site, network) {
    const n = network.apps?.length;
    if (!n) throw new Error("no apps in network.json");
    return [{ text: `Guides for ${plural(n, "app", "apps")}` }];
  },
  async book(site) {
    const n = count(JSON.parse(await getText(new URL("stats.json", site.url).href)).chapters);
    if (n === null) throw new Error("stats.json has no chapters");
    return [{ text: `Volume 1 · free · ${plural(n, "chapter", "chapters")}` }];
  },
  async blog(site) {
    const xml = await getText(new URL("rss.xml", site.url).href);
    const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map(([item]) => ({
      title: decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      link: decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
      date: Date.parse(decodeXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "")),
    })).filter((i) => i.title);
    if (!items.length) throw new Error("rss.xml has no posts");
    if (items.every((i) => !Number.isNaN(i.date))) items.sort((a, b) => b.date - a.date);
    return items.slice(0, 3).map((i) => ({ text: i.title, url: /^https?:\/\//.test(i.link) ? i.link : undefined }));
  },
  async games(site) {
    const stats = JSON.parse(await getText(new URL("stats.json", site.url).href));
    const version = stats.genshin_version ?? stats.version;
    const n = count(stats.videos ?? stats.video_count);
    if (typeof version !== "string" && typeof version !== "number") throw new Error("stats.json has no genshin_version");
    if (n === null) throw new Error("stats.json has no videos");
    return [{ text: `Genshin ${version} · ${plural(n, "video", "videos")} · refreshed Sundays` }];
  },
};

function tile(site, lines) {
  const lab = site.group === "lab" ? ' <span class="explore-tag">(Lab)</span>' : "";
  const head = `<h3 class="explore-title"><a href="${href(site.url)}">${escapeHtml(site.label)}<span aria-hidden="true"> &rarr;</span></a>${lab}</h3>`;
  let body;
  if (!lines) {
    body = `<p class="explore-text">${escapeHtml(site.description)}</p>`;
  } else if (lines.length === 1) {
    body = `<p class="explore-text">${escapeHtml(lines[0].text)}</p>`;
  } else {
    body = `<ul class="explore-list" role="list">\n${lines.map((l) => `            <li>${l.url ? `<a href="${escapeHtml(l.url)}">${escapeHtml(l.text)}</a>` : escapeHtml(l.text)}</li>`).join("\n")}\n          </ul>`;
  }
  const note = site.note ? `\n          <p class="explore-note">${escapeHtml(site.note)}</p>` : "";
  return `
        <li class="explore-tile explore-tile--${escapeHtml(site.id)}">
          ${head}
          ${body}${note}
        </li>`;
}

// Returns { html, total, live }.
export async function explore(network, current) {
  const sites = network.sites.filter((s) => s.id !== current);
  const results = await Promise.allSettled(sites.map(async (s) => {
    if (!LIVE[s.id]) return null;
    return await LIVE[s.id](s, network);
  }));
  let live = 0;
  const tiles = sites.map((s, i) => {
    const r = results[i];
    if (r.status === "rejected") {
      const e = r.reason;
      console.warn(`explore: ${s.id}: ${e?.cause?.code ?? e?.message ?? e}; showing plain text`);
      return tile(s, null);
    }
    if (r.value) live++;
    return tile(s, r.value);
  });
  return { html: `${tiles.join("")}\n        `, total: tiles.length, live };
}
