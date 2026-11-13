# somaari-site

Landing page for the Somaari apps, served at <https://somaari.in/>.

Plain static HTML and CSS: no frameworks, no CDNs, no external requests until a visitor presses Play on a video (fonts and video thumbnails are self-hosted), except the cookieless Cloudflare Web Analytics script, which the privacy page lists as the one exception. The only JavaScript is `theme.js` (seasonal default and the Appearance control, from [somaari-common](https://github.com/ashwinkrpi/somaari-common)), `shots.js` (per-theme screenshots) and `demo.js` (the demo player for the app cards). The build copies the themes in from somaari-common and the app guides live on [docs.somaari.in](https://docs.somaari.in/) (see [App guides](#app-guides)). Hosted on Cloudflare Pages (build command: `npm ci && npm run build`, output directory: `dist`, Node version from `.node-version`).

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: header, hero, Apps, In development, the blog band, footer |
| `about/index.html` | About page ("Hi, I'm Ashwin") at `/about/`, linked from the header and the footer |
| `style.css` | All styles (mobile-first); the site's own per-theme custom properties under `html[data-theme]` |
| `/theme/` (not in this repo) | `theme.js` (theme before first paint, seasonal schedule, the header Appearance control), `themes.css` (fonts and the tokens shared with somaari-plan) and `fonts/`, from somaari-common's `theme/`; the build downloads them (see [Themes](#themes)) |
| `shots.js` | Detail pages: shows the current theme's screenshot, and swaps it when the theme changes |
| `apps/<repo>/index.html` | One detail page per available app, served at `/apps/<repo>/` |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `privacy/index.html`, `terms/index.html` | Privacy policy and terms of service at `/privacy/` and `/terms/`, linked from the footer (also the somaari-video Google OAuth app's policy links) |
| `favicon.svg` | "S" mark icon |
| `robots.txt` | Allows all crawlers, points to the sitemap |
| `sitemap.xml` | The home page and each app detail page |
| `demo.js` | The demo player: "Watch demo" on a card opens a dialog that loads and plays that loop (never autoplays with reduced motion); posters only without JS |
| `assets/demos/<app>/` | Each card's `poster.webp` and the player's `loop.webm`, `loop.mp4` (720 px, < 1 MB); somaari-plan's is downloaded by the build instead |
| `assets/apps/<app>/` | The detail page's screenshot, copied from the app repo's docs (sample or demo data only), unless the manifest names it (see [Screenshots and demo loops from the app repo](#screenshots-and-demo-loops-from-the-app-repo)) |
| `scripts/asset-versions.mjs` | Adds `?v=<hash>` to the CSS/JS links so browsers never mix new HTML with a cached old file |
| `scripts/check-shared.mjs` | Checks every page has the same header and footer as `index.html` |
| `scripts/demo/` | Re-runnable recorders and the encoder for the demo loops (see its README) |
| `videos.json` | Each app's YouTube walkthrough ID and the "somaari apps" playlist ID; an empty ID means no video UI for that app. A new ID also needs the detail page's Video section (the build adds the card links); `npm run check` compares them |
| `video.js` | Detail pages: swaps the thumbnail for the YouTube embed (`youtube-nocookie.com`) when Play is pressed; nothing loads from YouTube before that |
| `assets/videos/<id>.jpg` | Self-hosted video thumbnails, so a detail page makes no request to YouTube on load |
| `scripts/check-videos.mjs` | Checks the pages against `videos.json` |
| `scripts/build.mjs` | The build: copies the site into `dist/`, downloads somaari-common's `theme/` into `dist/theme/` (and versions it), writes the landing cards and sitemap entries from somaari-common's `apps/apps.json` and downloads the screenshots and demo loops it names |
| `_redirects` | Sends the old guide URLs (`/apps/<repo>/docs/...`) to docs.somaari.in |
| `scripts/app-docs-workflow.yml` | The GitHub workflow each app repo copies, so a push to `docs/` rebuilds the site (for screenshots) |
| `_headers` | Cloudflare Pages security headers (strict CSP: `'self'` plus Cloudflare Web Analytics and the `youtube-nocookie.com` frame, no inline styles or scripts) |

## Preview locally

```sh
npm ci            # once
npm run build     # downloads the themes, screenshots and demo loops into dist/
python3 -m http.server -d dist 8000
```

Then open <http://localhost:8000>. (`_headers` only applies on Cloudflare Pages.) Only the files listed in
`PUBLISH` in `scripts/build.mjs` are copied to `dist/`; add a new top-level file there too.
`npm run check` runs the header/footer and asset-version checks. `npm run build -- --local ~/code/ai-projects` also takes `theme/` and `apps/apps.json` from your local somaari-common checkout.

Preview a theme without saving it by adding `?theme=<id>`, e.g. <http://localhost:8000/?theme=pi-console>.
Ids: `rangoli`, `monsoon`, `pi-console`, `liquid-glass`.

## Themes

The Appearance control (the round icon button in the header) saves the visitor's choice in `localStorage` and in a
`somaari-theme` cookie for `somaari.in`, so docs.somaari.in and blog.somaari.in follow it too. "Auto (seasonal)" clears it
and follows the date in India (Asia/Kolkata); no seasonal themes are scheduled at the moment, so it shows `rangoli`.

The themes, schedule and fonts live in somaari-common (`theme/`, standard: `docs/THEME_SPEC.md`), shared
with somaari-plan. To add a festival or change a shared colour, edit them there (`SCHEDULE` in
`theme/theme.js`, with a case in `tests/test_theme.py`); a push to its `main` rebuilds this site.
The site's own per-theme tokens and decorations stay in `style.css`.
Theme styles only change colours, fonts, spacing and decoration; the page text is the same in every theme.

## Adding an app

Nothing is copied between repos; each step is in the repo that owns it.

1. **Manifest:** add the app to somaari-common's [`apps/apps.json`](https://github.com/ashwinkrpi/somaari-common/blob/main/apps/apps.json)
   (title, status, `public`, description, tags, AI chip and its source). A push to `apps/` on `main`
   runs its tests and rebuilds this site, which writes the card into `index.html` from it: `live`
   apps under **Apps**, `dev` and `soon` under **In development**, in manifest order. "Details"
   appears with `"detail_page": true`, "View on GitHub" with `"public": true`. Don't hand-edit the
   cards: `index.html` holds only the `<!-- APPS:live -->` and `<!-- APPS:dev -->` markers.
2. **Demo poster (optional):** put `poster.webp`, `loop.webm` and `loop.mp4` in `assets/demos/<repo>/`
   (see `scripts/demo/README.md`), or have the app repo publish them (`"demo"` in the manifest, see
   [below](#screenshots-and-demo-loops-from-the-app-repo)). A card without either has no demo block.
   A YouTube ID in `videos.json` adds the card's Video link.
3. **Detail page, once it's live:** write `apps/<repo>/index.html` (next section) and set
   `"status": "live"` and `"detail_page": true`. The build adds it to `sitemap.xml` and fails if
   the manifest says there's a page but the file is missing.
4. **Guide, once the repo is public:** write `docs/GUIDE.md` in the app repo and add `"guide"` to its
   manifest entry; docs.somaari.in picks it up within the hour. If this site shows a screenshot or
   demo from the app repo, also copy `scripts/app-docs-workflow.yml` to the app repo's
   `.github/workflows/site-docs.yml` and add its `SOMAARI_SITE_DEPLOY_HOOK` secret.

## Add an app detail page

1. Copy `apps/somaari-plan/` to `apps/NAME/` and put its screenshot in `assets/apps/NAME/`
   (from the app repo's docs, sample or demo data only). Set the `<img>` `width` and `height`.
2. Edit the title, meta and Open Graph tags, canonical URL, intro, capabilities, platforms and
   "What you need". Take every fact from the app's README and `docs/GUIDE.md`; if something isn't
   stated there, leave a `<!-- TODO -->` comment instead of guessing.
3. Main action, chosen from the repo:
   - **Download** only if it has a GitHub Release with assets
     (`gh release view -R ashwinkrpi/NAME --json assets`); link to `/releases/latest`, never a fixed version.
   - **Documentation** if there's no release but there is a guide; link to `https://docs.somaari.in/<repo>/`.
   - **View source** otherwise, and then leave out the "View on GitHub" link (same place).
   Every page with a guide has exactly one "Documentation" link to it: the main action when there's
   no release, otherwise a secondary button next to Download.
4. Set `"detail_page": true` in the manifest: that adds the card's "Details" link and the sitemap entry.
5. Run `node scripts/asset-versions.mjs` and `node scripts/check-shared.mjs`.

The header and footer sit between `<!-- SHARED HEADER -->` / `<!-- SHARED FOOTER -->` markers and
must match `index.html` on every page. After changing them in `index.html`, paste the new blocks
into each `apps/*/index.html`; `node scripts/check-shared.mjs` exits 1 if a copy differs.

somaari-terminal's detail page, when it is written, needs a "How AI is used" section like
`apps/somaari-plan/`'s, from the somaari-terminal README's Privacy section.

## App guides

The app guides are on [docs.somaari.in](https://docs.somaari.in/), built by the
[somaari-docs](https://github.com/ashwinkrpi/somaari-docs) repo from each app repo's `docs/GUIDE.md`.
This site has no guide pages: `_redirects` sends the old `/apps/<repo>/docs/...` URLs (anchors and
images included) to `https://docs.somaari.in/<repo>/...`. On a detail page, link "Documentation" to
`https://docs.somaari.in/<repo>/` (one link only; don't add a separate installation-guide link).
To publish a new app's guide, follow the somaari-docs README.

## Screenshots and demo loops from the app repo

An app's detail page screenshot and card demo loop can live only in the app repo, so
they update on the site when they change there. Add them to the app's entry in somaari-common's `apps/apps.json`:

- `"screenshot": "docs/screenshots/x.png"`: one PNG or JPEG for the detail page, or
  `{ "<theme id>": "<path>", ... }` with one per theme (all five, same size). The build downloads
  them into `assets/apps/<repo>/` and fills in the page's `<figure class="detail-shot">`, keeping its
  `alt` and setting `width`/`height`. With one per theme, `shots.js` loads only the current theme's.
  Don't commit a copy to `assets/apps/<repo>/`.
- `"demo": { "ref": "site-demo" }`: the app repo branch holding `loop.webm`, `loop.mp4` and
  `poster.webp` (each under 1 MB) at its root. The build copies them into `assets/demos/<repo>/`.

somaari-plan's `.github/workflows/site-demo.yml` writes its `site-demo` branch: on a push to `web/`
it records the demo in headless Chromium (Playwright, AI off), encodes it with this repo's
`scripts/demo/encode.sh` and rebuilds the site.

## After editing style.css, shots.js or demo.js

Run `node scripts/asset-versions.mjs` before committing. Cloudflare lets browsers cache these files
for hours, so each changed file needs a new `?v=` in every HTML page; otherwise returning
visitors get the new page with the old stylesheet. `node scripts/asset-versions.mjs --check` exits 1
if a version is out of date. The build versions `/theme/theme.js` and `/theme/themes.css` itself.

## Other things to edit

- **About text ("Hi, I'm Ashwin"):** between `<!-- INTRO -->` and `<!-- /INTRO -->` in `about/index.html`.
- **AI chips:** each card and detail page shows "AI-powered", "AI optional" or "No AI" next to its
  status badge (`.badge--ai`). These say whether the app *uses* AI, taken from its README; "built
  with AI" in the tagline and About section is about how the apps are made.
- **Hero headline and buttons:** the `hero` section at the top of `<main>` in `index.html`.
- **Games link:** <https://games.somaari.in/> (somaari-games, top Genshin Impact videos from Reddit) is in the shared footer, after Blog.
- **Blog link:** the blog (<https://blog.somaari.in/>) is linked from the shared footer and from the
  "From the blog" band after "In development" in `index.html`, whose text is the blog's own description.
  `index.html`'s `<head>` also points feed readers at `https://blog.somaari.in/rss.xml`.
- **Contact:** `hello@somaari.in` (Cloudflare Email Routing) is in the Contact sections of the privacy and terms pages, not in the footer.
- **Copyright year:** hard-coded in the footer of every page (the shared footer and `404.html`) (no inline script, to keep the CSP strict).
- **Demo loops:** re-record and re-encode with `scripts/demo/` (see `scripts/demo/README.md`), except
  apps whose loop comes from their repo (see [above](#screenshots-and-demo-loops-from-the-app-repo)).
- **Sitemap date:** update `<lastmod>` in `sitemap.xml` after significant changes. The `/apps/<repo>/` entries are written by the build, dated by the page's last commit.

## Contributing

This is the source for a personal site and doesn't accept pull requests; only collaborators can
open them. If you spot a typo, broken link or other problem, please report it in
[Issues](https://github.com/ashwinkrpi/somaari-site/issues).
