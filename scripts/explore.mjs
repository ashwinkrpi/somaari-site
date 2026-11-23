// The landing page's "Explore Somaari" row: one tile per site in network.json (except this one), built at
// build time by scripts/build.mjs between <!-- EXPLORE --> and <!-- /EXPLORE --> in index.html.
//
//   docs   "Guides for N apps"                            N = the apps in network.json
//   book   "Volume 1 · free · N chapters"                 <book url>/stats.json: { "chapters": N or [...] }
//   blog   "Latest: <newest post title> · 20 Nov" (a link)  <blog url>/rss.xml
//   games  "Genshin <version> · N videos · refreshed 15 Nov"  (or "refreshed Sundays" when stats.json has no date)
//                                                         <games url>/stats.json: { "genshin_version", "videos": N or [...], "refreshed_ist" }
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

// "20 Nov" for a timestamp in ms, or null when it is not a date.
const shortDate = (ms) => Number.isNaN(ms) || ms === undefined ? null
  : new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const count = (v) => (Array.isArray(v) ? v.length : Number.isInteger(v) && v >= 0 ? v : null);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function decodeXml(s) {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&").trim();
}

// The latest 3 posts of the blog's rss.xml: { title, url, date (ms or NaN), tag }[]. Throws if unusable.
async function latestPosts(site) {
  const xml = await getText(new URL("rss.xml", site.url).href);
  const tag = (item, name) => decodeXml(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? "");
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map(([item]) => {
    const link = tag(item, "link");
    return {
      title: tag(item, "title"),
      url: /^https?:\/\//.test(link) ? link : undefined,
      date: Date.parse(tag(item, "pubDate")),
      tag: tag(item, "category"),
    };
  }).filter((i) => i.title);
  if (!items.length) throw new Error("rss.xml has no posts");
  if (items.every((i) => !Number.isNaN(i.date))) items.sort((a, b) => b.date - a.date);
  return items.slice(0, 3);
}

// The landing page's blog post cards (title, date, tag), or null when rss.xml is unreachable (the page
// then keeps its plain blurb).
export async function blogCards(network) {
  const site = network.sites.find((s) => s.id === "blog");
  try {
    const posts = await latestPosts(site);
    const cards = posts.map((p) => {
      const title = p.url ? `<a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a>` : escapeHtml(p.title);
      const iso = Number.isNaN(p.date) ? "" : new Date(p.date).toISOString().slice(0, 10);
      const date = iso ? `<time datetime="${iso}">${iso}</time>` : "";
      const label = p.tag ? `<span class="badge badge--platform">${escapeHtml(p.tag)}</span>` : "";
      return `            <li class="post-card">
              <h3 class="post-title">${title}</h3>
              <p class="post-meta">${date}${date && label ? " " : ""}${label}</p>
            </li>`;
    });
    return `\n          <ul class="post-grid" role="list">\n${cards.join("\n")}\n          </ul>\n          `;
  } catch (e) {
    console.warn(`blog posts: ${e?.cause?.code ?? e?.message ?? e}; keeping the plain blurb`);
    return null;
  }
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
    // The newest post, as a link: this is the "recent highlight". The full list is in "From the blog" below.
    const [latest] = await latestPosts(site);
    const when = shortDate(latest.date);
    return [{ text: `Latest: ${latest.title}${when ? ` · ${when}` : ""}`, url: latest.url }];
  },
  async games(site) {
    const stats = JSON.parse(await getText(new URL("stats.json", site.url).href));
    const version = stats.genshin_version ?? stats.version;
    const n = count(stats.videos ?? stats.video_count);
    if (typeof version !== "string" && typeof version !== "number") throw new Error("stats.json has no genshin_version");
    if (n === null) throw new Error("stats.json has no videos");
    const when = shortDate(Date.parse(stats.refreshed_ist ?? stats.refreshed ?? ""));
    return [{ text: `Genshin ${version} · ${plural(n, "video", "videos")} · refreshed ${when ?? "Sundays"}` }];
  },
};

function tile(site, lines) {
  const isLab = site.group === "lab";
  const lab = isLab ? ' <span class="explore-tag">Lab</span>' : "";
  const head = `<h3 class="explore-title"><a href="${href(site.url)}">${escapeHtml(site.label)}<span aria-hidden="true"> &rarr;</span></a>${lab}</h3>`;
  let body;
  if (!lines) {
    body = `<p class="explore-text">${escapeHtml(site.description)}</p>`;
  } else if (lines.length === 1) {
    const l = lines[0];
    body = `<p class="explore-text">${l.url ? `<a href="${escapeHtml(l.url)}">${escapeHtml(l.text)}</a>` : escapeHtml(l.text)}</p>`;
  } else {
    body = `<ul class="explore-list" role="list">\n${lines.map((l) => `            <li>${l.url ? `<a href="${escapeHtml(l.url)}">${escapeHtml(l.text)}</a>` : escapeHtml(l.text)}</li>`).join("\n")}\n          </ul>`;
  }
  const note = site.note ? `\n          <p class="explore-note">${escapeHtml(site.note)}</p>` : "";
  return `
        <li class="explore-tile explore-tile--${escapeHtml(site.id)}${isLab ? " explore-tile--lab" : ""}">
          ${head}
          ${body}${note}
        </li>`;
}

// Returns { html, total, live }.
// The Apps tile is left out when the page's apps section directly follows the hero (pageHtml), since the
// top nav and the hero's "Explore apps" button already lead there.
export async function explore(network, current, pageHtml = "") {
  const appsFollowHero = /<\/section>\s*<section class="apps\b[^>]*id="apps"/.test(pageHtml)
    && /<section class="hero\b/.test(pageHtml);
  const sites = network.sites.filter((s) => s.id !== current && !(s.id === "apps" && appsFollowHero));
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
