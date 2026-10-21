# somaari-site

Landing page for the Somaari apps, served at <https://somaari.in/>.

Plain static HTML and CSS: no frameworks, no CDNs, no external requests (fonts are self-hosted). The only JavaScript is `theme.js` (seasonal default and the Appearance control, from [somaari-common](https://github.com/ashwinkrpi/somaari-common)), `shots.js` (per-theme screenshots) and `demo.js` (the demo player for the app cards). The build copies the themes in from somaari-common and turns each app's guide, kept in that app's repo, into a page on the site (see [App guides](#app-guides)). Hosted on Cloudflare Pages (build command: `npm ci && npm run build`, output directory: `dist`, Node version from `.node-version`).

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: header, hero, Apps, In development, About ("Hi, I'm Ashwin"), footer |
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
| `assets/apps/<app>/` | The detail page's screenshot, copied from the app repo's docs (sample or demo data only), unless `docs.config.json` names it (see [Screenshots and demo loops from the app repo](#screenshots-and-demo-loops-from-the-app-repo)) |
| `scripts/asset-versions.mjs` | Adds `?v=<hash>` to the CSS/JS links so browsers never mix new HTML with a cached old file |
| `scripts/check-shared.mjs` | Checks every page has the same header and footer as `index.html` |
| `scripts/demo/` | Re-runnable recorders and the encoder for the demo loops (see its README) |
| `docs.config.json` | Which app guides the build publishes (see [App guides](#app-guides)), and which screenshots and demo loops it downloads from the app repos |
| `scripts/build-docs.mjs` | The build: copies the site into `dist/`, downloads somaari-common's `theme/` into `dist/theme/` (and versions it), adds `/apps/<repo>/docs/` for each guide and downloads the screenshots and demo loops `docs.config.json` names |
| `scripts/app-docs-workflow.yml` | The GitHub workflow each app repo copies, so a docs push rebuilds the site |
| `_headers` | Cloudflare Pages security headers (strict CSP: `'self'` plus Cloudflare Web Analytics, no inline styles or scripts) |

## Preview locally

```sh
npm ci            # once
npm run build     # downloads the guides into dist/
python3 -m http.server -d dist 8000
```

Then open <http://localhost:8000>. (`_headers` only applies on Cloudflare Pages.) Only the files listed in
`PUBLISH` in `scripts/build-docs.mjs` are copied to `dist/`; add a new top-level file there too.
`npm run check` runs the header/footer and asset-version checks. `npm run build -- --local ~/code/ai-projects` also takes `theme/` from your local somaari-common checkout.

Preview a theme without saving it by adding `?theme=<id>`, e.g. <http://localhost:8000/?theme=dasara-jamboo>.
Ids: `warm-tactile`, `liquid-glass`, `dasara-jamboo`, `rajyotsava`.

## Themes

The Appearance control (the round icon button in the header) saves the visitor's choice in `localStorage`; "Auto (seasonal)" clears it
and follows the date in India (Asia/Kolkata):

- 17–20 October 2026: `dasara-jamboo`
- 1–7 November, every year: `rajyotsava`
- Otherwise: `warm-tactile`

The themes, schedule and fonts live in somaari-common (`theme/`, standard: `docs/THEME_SPEC.md`), shared
with somaari-plan. To add a festival or change a shared colour, edit them there (`SCHEDULE` in
`theme/theme.js`, with a case in `tests/test_theme.py`); a push to its `main` rebuilds this site.
The site's own per-theme tokens and decorations stay in `style.css`.
Theme styles only change colours, fonts, spacing and decoration; the page text is the same in every theme.

## Add a new app card

1. In `index.html`, copy one block from `<!-- CARD START: ... -->` to `<!-- CARD END: ... -->`.
2. Paste it just before the closing `</ul>` of the right section: **Apps** (`#apps`) for available
   apps, **In development** (`#in-development`) for apps that aren't out yet. The grid is one column
   on phones and two from tablet width up; a lone last card keeps the column width.
3. Every card has the same parts, in this order: demo poster and "Watch demo" button (optional),
   title, repo label, status badge, description, tags, links. Edit:
   - the `card-media` block: point the poster and the button's `data-demo` at `/assets/demos/NAME/`
     and set `data-title` to the card title (or delete the block if there's no demo yet)
   - `<h3 class="card-title">`: what the tool does, e.g. "Disk Usage Analyzer"
   - `<p class="card-repo">`: the repo name, e.g. `somaari-disk` (kept outside the `h3`)
   - the description, tags and status badge. Badge classes:
     - `badge--dev` – In development
     - `badge--soon` – Coming soon
     - `badge--live` – Available
4. Links go in `<div class="card-actions">`. "Details" links to the app's detail page, once it
   has one (see below). Only link a repo once it is **public**:
   ```html
   <div class="card-actions">
     <a class="btn" href="/apps/NAME/">Details<span class="visually-hidden"> about TITLE</span></a>
     <a class="btn btn--secondary" href="https://github.com/ashwinkrpi/NAME">View on GitHub<span class="visually-hidden"> (NAME)</span></a>
   </div>
   ```
   Until then leave the GitHub link out; the status badge already says where the app is.
5. Commit and push to `main`; Cloudflare Pages redeploys automatically.

## Add an app detail page

1. Copy `apps/somaari-plan/` to `apps/NAME/` and put its screenshot in `assets/apps/NAME/`
   (from the app repo's docs, sample or demo data only). Set the `<img>` `width` and `height`.
2. Edit the title, meta and Open Graph tags, canonical URL, intro, capabilities, platforms and
   "What you need". Take every fact from the app's README and `docs/GUIDE.md`; if something isn't
   stated there, leave a `<!-- TODO -->` comment instead of guessing.
3. Main action, chosen from the repo:
   - **Download** only if it has a GitHub Release with assets
     (`gh release view -R ashwinkrpi/NAME --json assets`); link to `/releases/latest`, never a fixed version.
   - **Installation guide** if there's no release but there are install docs; link to that section.
   - **View source** otherwise, and then leave out the "View on GitHub" link (same place).
4. Add the page to `sitemap.xml` and a "Details" link to the app's card.
5. Run `node scripts/asset-versions.mjs` and `node scripts/check-shared.mjs`.

The header and footer sit between `<!-- SHARED HEADER -->` / `<!-- SHARED FOOTER -->` markers and
must match `index.html` on every page. After changing them in `index.html`, paste the new blocks
into each `apps/*/index.html`; `node scripts/check-shared.mjs` exits 1 if a copy differs.

## App guides

Each app's guide is written only in its own repo (`docs/GUIDE.md`). `npm run build` downloads it from
GitHub (the `main` branch) and turns it into `/apps/<repo>/docs/`, with the app's detail page as the
head, header and footer. Images the guide uses are copied next to it. Links to other repo files point
to GitHub, links between published guides stay on the site, and the docs URLs are added to the sitemap.
Never edit the generated pages; change the guide in the app repo.

The build fails, and Cloudflare keeps the current deploy, if a guide:
- can't be downloaded (the repo isn't public, or the file isn't on that branch)
- mentions self-hosting, in its text or in an SVG it uses
- links to a heading that doesn't exist, or uses an image from outside its `docs/` folder or from another site

It leaves out any image named `banner.svg` (the page has its own title) and anything between
`<!-- site:skip -->` and `<!-- /site:skip -->`, for parts that belong on GitHub only. It doesn't
check text inside screenshots: make sure none of them show a "Self-Hosted" label.

To preview unpushed guide edits, read the app repos from disk instead of GitHub:
`npm run build -- --local ~/code/ai-projects`.

### Publish an app's guide

Do this once the app's repo is public and it has a detail page:

1. Add it to `docs.config.json`: `{ "repo": "NAME", "ref": "main", "src": "docs/GUIDE.md" }`.
2. Run `npm run build` and check `/apps/NAME/docs/` in all four themes.
3. On the detail page, add `<a class="btn btn--secondary" href="/apps/NAME/docs/">Read the guide…</a>`
   to `detail-actions`, and point any "Installation guide" link at `/apps/NAME/docs/#-installation`.
4. In the app repo, copy `scripts/app-docs-workflow.yml` to `.github/workflows/site-docs.yml` and add
   the repo secret `SOMAARI_SITE_DEPLOY_HOOK` (the deploy hook URL from Cloudflare Pages: Settings,
   Builds, Deploy hooks). From then on, a push to `docs/` on `main` rebuilds the site.

### Screenshots and demo loops from the app repo

Like the guide, an app's detail page screenshot and card demo loop can live only in the app repo, so
they update on the site when they change there. Add them to the app's entry in `docs.config.json`:

- `"screenshot": "docs/screenshots/x.png"`: one PNG or JPEG for the detail page, or
  `{ "<theme id>": "<path>", ... }` with one per theme (all four, same size). The build downloads
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

- **About text ("Hi, I'm Ashwin"):** between `<!-- INTRO -->` and `<!-- /INTRO -->` in `index.html`.
- **AI chips:** each card and detail page shows "AI-powered", "AI optional" or "No AI" next to its
  status badge (`.badge--ai`). These say whether the app *uses* AI, taken from its README; "built
  with AI" in the tagline and About section is about how the apps are made.
- **Hero headline and buttons:** the `hero` section at the top of `<main>` in `index.html`.
- **Contact:** `hello@somaari.in` in the shared footer (and `404.html`), and on the privacy and terms pages (Cloudflare Email Routing forwards it).
- **Copyright year:** hard-coded in the footer of every page (the shared footer and `404.html`) (no inline script, to keep the CSP strict).
- **Demo loops:** re-record and re-encode with `scripts/demo/` (see `scripts/demo/README.md`), except
  apps whose loop comes from their repo (see [above](#screenshots-and-demo-loops-from-the-app-repo)).
- **Sitemap date:** update `<lastmod>` in `sitemap.xml` after significant changes.

## Contributing

This is the source for a personal site and doesn't accept pull requests; only collaborators can
open them. If you spot a typo, broken link or other problem, please report it in
[Issues](https://github.com/ashwinkrpi/somaari-site/issues).
