<!-- bg: branch build-guru/PLAN -->
# Somaari site improvements: somaari-site

### Stage 1: Single source of truth
- [x] [moderate] Create `network.json` at the repo root, served at https://somaari.in/network.json. Keys: `sites` (id, label, url, one-line description, icon, group `main` or `lab`), `apps` (id, name, status, AI tag, details URL, guide URL, repo URL), `contact`, `author`, `social` (GitHub, YouTube). Fill it from the current site. Nav order: Apps, Docs, Book, Blog, Games (Games in group `lab`, with its "fan project" note). Terminal app is named `somaari-terminal`. Contact: hello@somaari.in (general), support@somaari.in (apps). Author: "Ashwin Koppam Raghavendra, Bengaluru". <!-- bg: done sonnet 2026-11-18 -->
- [x] [moderate] Add `scripts/fetch-network.mjs` that the other repos can copy: it downloads `network.json` at build time and falls back to a committed copy if the download fails. Add a check for it to `npm run check`. <!-- bg: done sonnet 2026-11-18 -->

### Stage 2: Shared header and footer
- [x] [moderate] Build the shared header from `network.json`: Somaari logo (links to somaari.in), Apps, Docs, Book, Blog, Games, with the current site highlighted. On phones collapse it into a menu button that opens a drawer usable with a keyboard. <!-- bg: done sonnet 2026-11-18 -->
- [x] [moderate] Add the "Somaari sites" switcher: a small grid menu listing every site with its one-line description, Lab sites in a separate group. <!-- bg: done sonnet 2026-11-18 -->
- [x] [moderate] Build the shared footer from `network.json`: all sites (Lab marked), GitHub, YouTube and RSS, both contact emails, Privacy and Terms, and the author line "Built by Ashwin Koppam Raghavendra, Bengaluru". Show the author line on the About page too. <!-- bg: done sonnet 2026-11-18 -->
- [ ] [manual] Add the theme picker cookie on `.somaari.in`: read it on load and write it when the theme changes. Keep working when cookies are blocked. <!-- bg: blocked opus 2026-11-18: This is already done, so I changed nothing. somaari-common's `theme/theme.js` already reads the `somaari-theme` cookie on `Domain=somaari.in` when the page loads and writes it whenever the theme chang -->
- [x] [simple] Make the header, switcher and footer a shared partial so the docs pages use the same one. <!-- bg: done haiku 2026-11-18 -->

### Stage 3: Link fixes
- [ ] [manual] Make the terminal app name `somaari-terminal` everywhere on the homepage and docs pages (fix "ATAI" and any third name). <!-- bg: blocked haiku 2026-11-18: the terminal's card title ("AI-assisted Terminal" in `dist/index.html`) comes from `title` in somaari-common's `apps/apps.json`, fetched from GitHub at build time, and the docs pages are on the separa -->
- [ ] [manual] Give the in-development terminal a GitHub or "Follow progress" link (its repo, or the blog tag if the repo is private). <!-- bg: blocked haiku 2026-11-18: the terminal's card is generated from somaari-common's `apps/apps.json` (fetched at build time, not in this repo), and its GitHub link depends on that file's `public` flag. Whether the repo is public -->
- [ ] [manual] Search the repo for `github.io`, `wordpress.com` and old URLs, and point them to somaari subdomains. <!-- bg: blocked sonnet 2026-11-18: nothing to change. The repo has no `github.io` or `wordpress.com` URLs, and no other old URLs. The only matches are in `PLAN.md`, which I can't edit. The remaining external links are `github.com/ashwi -->
- [x] [moderate] Add a small internal link checker to `scripts/` and run it from `npm run check`; fix every broken link it finds. <!-- bg: done sonnet 2026-11-18 -->

### Stage 4: Homepage upgrades
- [x] [moderate] Hero: keep the headline and site copy as is; add the "Free book" badge and link and a third button "Read the book". <!-- bg: done sonnet 2026-11-18 -->
- [x] [complex] Add an "Explore Somaari" row right under the hero, one tile per site generated from `network.json` at build time: Docs "Guides for N apps" (N counted from `apps`), Book "Volume 1 · free · N chapters", Blog titles of the latest 3 posts from `rss.xml`, Games (Lab) "Genshin <version> · N videos · refreshed Sundays" read from the games site's `stats.json`. Each tile must fall back to plain text when its source is unreachable. <!-- bg: done opus 2026-11-18 -->
- [x] [moderate] App cards: add platform badges (Raspberry Pi, Linux, Windows), latest version and release date from the GitHub Releases API at build time (cached, skipped if offline), and a screenshot thumbnail when the app has one. <!-- bg: done sonnet 2026-11-18 -->
- [ ] [manual] Remove the empty Demo section from the homepage. <!-- bg: blocked haiku 2026-11-18: the homepage has no empty Demo section to remove. The only "Demo" element is the `<dialog id="demo-dialog">` player in `index.html` (lines 156-172), and it is live: `demo.js` opens it from the "Play d -->
- [x] [moderate] Replace the "From the blog" blurb with 3 post cards (title, date, tag) from `rss.xml`. <!-- bg: done sonnet 2026-11-18 -->
- [x] [simple] Add a contact line with both emails and a "Report an issue" link to GitHub Issues. <!-- bg: done haiku 2026-11-18 -->
- [x] [simple] Check that the homepage still shows its main content with JavaScript turned off. <!-- bg: done haiku 2026-11-18 -->

### Stage 5: UI polish
- [x] [moderate] Share the colour variables so every theme, including the seasonal ones, works on every page; same favicon, logo and font sizes. <!-- bg: done sonnet→opus 2026-11-18 -->
- [x] [moderate] Make every tap target at least 44 px, make sure no page scrolls sideways at 360 px wide, and keep the existing skip link. <!-- bg: done sonnet 2026-11-18 -->
- [x] [moderate] Check colour contrast for every theme (WCAG AA), make focus outlines visible, add alt text to images, and respect the reduce-motion setting. <!-- bg: done sonnet 2026-11-18 -->
- [x] [simple] Add a friendly 404 page with links to all sites. <!-- bg: done haiku 2026-11-18 -->
- [ ] [moderate] Lazy-load images, convert them to WebP, and preload fonts.
- [ ] [moderate] Add Pagefind search to somaari.in.
- [ ] [simple] Add an RSS discovery `<link>` tag to the homepage head.

### Stage 6: SEO and sharing
- [ ] [simple] Make `sitemap.xml` and `robots.txt` correct; robots.txt lists every subdomain's sitemap.
- [ ] [moderate] Generate OG images at build time (site name and page title on the Warm Tactile palette) and add canonical URLs plus OG and Twitter meta tags.
- [ ] [simple] Add JSON-LD: `Organization` and `WebSite` with `sameAs` listing the GitHub, YouTube and subdomain URLs; `SoftwareApplication` on each app page.
- [ ] [simple] Use the title pattern "Page · Somaari" on every page.
- [ ] [moderate] Add a script to `npm run check` that confirms each page has a title, description, canonical URL and OG image.

### Manual
- [ ] [manual] Open the `build-guru/PLAN` preview on Cloudflare Pages on phone and desktop; click through the switcher and footer links.
- [ ] [manual] Merge the branch into `main`; Cloudflare Pages deploys it.
- [ ] [manual] Google Search Console: add a Domain property for `somaari.in`, add the TXT record in Cloudflare DNS, submit each subdomain's sitemap, spot-check one page per site with the Rich Results Test.
- [ ] [manual] Optional: post "Somaari is now one connected network" through Supergrow.
