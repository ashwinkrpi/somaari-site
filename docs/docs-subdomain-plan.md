# docs.somaari.in: plan

Status: plan only, nothing built yet. Written 2026-10-31. Revised 2026-11-09 for automation first: Claude runs the stages back to back, deploys with wrangler from the Pi, and merges its own PRs once the checks pass. The owner only reads a GitHub issue if something breaks.

Move the somaari app guides from `somaari.in/apps/<repo>/docs/` to their own site at `docs.somaari.in`, then make one app manifest the source for both the docs site and the landing page cards.

## Goals

1. **One home per fact.** Guides stay written only in each app repo (`docs/GUIDE.md`). somaari.in keeps the pitch (card, detail page, screenshot, demo). docs.somaari.in has how to install and use each app. Nothing is copied by hand between them.
2. **Scales to many apps.** Adding an app = one manifest entry + a `docs/GUIDE.md` in its repo. No hand-written HTML for the docs.
3. **No broken links.** Every old `/apps/<repo>/docs/` URL, including `#anchors`, keeps working through a 301.
4. **Same look everywhere.** somaari-site, the blog and the docs site share the four somaari-common themes and the same header and footer.
5. **Same rules as today.** Strict CSP, no external requests, self-hosted fonts, no mention of self-hosting, a failed build keeps the current deploy.

## Rules for Claude (every stage)

- **No stopping between stages.** Work through the stages in order in one go. Read this file's "Rules", "Decisions" and the current stage only ("Current state" when the stage touches somaari-site). If the context gets long, `/clear` and continue from "Progress".
- **Checks replace owner reviews.** Each stage's "Done when" is the gate. If a check fails, fix it; after 2 failed tries, open a GitHub issue with `scripts/notify.sh` (or `gh issue create` before that script exists) and stop.
- **Git.** somaari-docs: commit to `main` and push, one commit per stage. Every other repo: branch `docs-site/stage-N`, push, open a PR, and merge it yourself with `gh pr merge --squash --delete-branch` once that repo's checks pass. Never force-push and never `--admin`.
- **Deploys.** docs.somaari.in: `wrangler versions upload` → smoke-test the preview URL → `wrangler deploy` → smoke-test live → `wrangler rollback` on failure. somaari-site deploys itself when its PR merges to `main` (Cloudflare Pages); verify it live with `curl`.
- **OWNER** marks the few steps that need a person (a GitHub secret or the Cloudflare dashboard). Only stop for one if the stage truly can't continue without it, and list exactly what's needed.
- Never write a deploy hook URL, token or other secret into any file. Never read `.env` or the wrangler config.
- Each repo has its own `README.md`/`CLAUDE.md` with conventions (commit style, comment density, checks). Follow them.
- When a stage is done, tick its box in "Progress" and add a one-line note for anything that differs from the plan.

## Current state (2026-10-31)

### Repos

| Repo | Path | Visibility | Role |
|---|---|---|---|
| somaari-site | `~/code/ai-projects/somaari-website/somaari-site` | public | somaari.in, Cloudflare Pages, build `npm ci && npm run build`, output `dist` |
| somaari-common | `~/code/ai-projects/somaari-common` | public | themes (`theme/`), About JSON; `site-theme.yml` triggers the somaari-site deploy hook |
| somaari-blog | `~/code/ai-projects/somaari-blog` | — | blog.somaari.in, Astro 7, Cloudflare Workers (`wrangler deploy`), vendors somaari-common via `npm run sync:common` |
| somaari-disk, somaari-plan, somaari-trip | `~/code/ai-projects/<repo>` | public | published guides, each with `.github/workflows/site-docs.yml` |
| somaari-terminal | `~/code/ai-projects/somaari-terminal` | private | in development; has `docs/GUIDE.md` (367 lines), not published yet |
| somaari-server | `~/code/ai-projects/somaari-server` | private | has `docs/GUIDE.md` (306 lines), can't be fetched without a token |

### How guides are published today

- `somaari-site/docs.config.json` lists `{ repo, ref, src }` per app plus optional `screenshot` and `demo`. Today: somaari-disk, somaari-plan, somaari-trip.
- `somaari-site/scripts/build-docs.mjs` (322 lines) does everything:
  - copies `PUBLISH` files to `dist/`
  - `theme()`: downloads somaari-common `theme/` into `dist/theme/`
  - per app: `screenshots()`, `demo()`, then `render()` the guide and `page()` it into `dist/apps/<repo>/docs/index.html`, using the app's detail page as the shell
  - appends the docs URLs to `sitemap.xml`
  - `stampThemeVersions()` adds `?v=<hash>` to `/theme/` links
- `render()` rules that must carry over to the docs site:
  - GitHub heading ids via `github-slugger` (detail pages link to `#-installation` and `#ai`)
  - GitHub alerts `> [!NOTE]` → callouts
  - strip `banner.svg` images and `<!-- site:skip -->…<!-- /site:skip -->` blocks
  - links: same-guide anchors stay; links to another published guide stay on the site; other repo files → GitHub
  - images only from inside the guide's `docs/` folder, copied next to the page
  - **fails the build** on: a guide that can't be fetched, any "self-host" wording (text or SVG), a link to a missing heading, an image from outside `docs/` or another site
  - `sanitize-html` allow-list
  - `--local <dir>` reads sibling checkouts instead of GitHub
- Each app's `site-docs.yml` (template: `somaari-site/scripts/app-docs-workflow.yml`) runs on a push to `docs/**` on `main`: greps `docs/GUIDE.md` for self-hosting, then POSTs `secrets.SOMAARI_SITE_DEPLOY_HOOK`. Screenshots also live under `docs/`, so the same push must keep rebuilding somaari.in after the move.

### Links into the guides

- `apps/somaari-disk/index.html:99`, `apps/somaari-plan/index.html:98,99,135`, `apps/somaari-trip/index.html:98,99`: "Installation guide" (`/apps/<repo>/docs/#-installation`), "Read the guide" (`/apps/<repo>/docs/`), and `#ai` on the plan page.
- `about/index.html:89`: "each have a detail page and a guide".
- Each guide page's canonical/og URLs and the sitemap entries come from `build-docs.mjs`.

### Shared header and footer

- Header nav: Apps (`/#apps`), About (`/about/`), GitHub. Footer: About, Blog (`https://blog.somaari.in/`), GitHub, Privacy, Terms.
- `scripts/check-shared.mjs` checks every page's `<!-- SHARED HEADER -->`/`FOOTER` block matches `index.html`.

### Landing page cards

- `index.html` has hand-written cards between `<!-- CARD START: <repo> -->` and `<!-- CARD END: <repo> -->`, in two lists: "Apps" (`#apps`) and "In development" (`#in-development`), with the "HOW TO ADD AN APP CARD" comment above them.
- Each card has: optional demo block, title, repo, status badge (`badge--live`/`--dev`/`--soon`), AI chip with a source comment, description, tags, "Details" and (public repos only) "View on GitHub".

### CSP (`somaari-site/_headers`)

`default-src 'self'; img-src 'self'; style-src 'self'; font-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests`, no inline styles or scripts.

## Decisions

These are the defaults the stages assume. The owner can change any of them before Stage 1; update this table if so.

| # | Question | Decision |
|---|---|---|
| D1 | Docs tool | **Starlight** (Astro), same framework family as the blog: sidebar, search (Pagefind), mobile nav, i18n later. Stage 1 is a spike that must pass the checks below; if it fails, switch to the **fallback** without asking: move `build-docs.mjs`'s renderer into a plain static generator in somaari-docs (no sidebar/search framework), and say why in SPIKE.md. |
| D2 | Repo | New public repo **`ashwinkrpi/somaari-docs`** at `~/code/ai-projects/somaari-docs`: site config, theme bridge, import script. No guide content committed. |
| D3 | Hosting | **Cloudflare Workers static assets**, Worker `somaari-docs`, custom domain `docs.somaari.in` set in `wrangler.jsonc` (`routes: [{ pattern: "docs.somaari.in", custom_domain: true }]`), deployed with wrangler from the Pi, the same way as somaari-blog and somaari-games. Changed from Pages on 2026-11-09: wrangler on the Pi is already logged in, so no dashboard steps are needed, and Workers static assets read `_headers` and `_redirects` too. |
| D4 | URL scheme | `docs.somaari.in/` lists the apps; `docs.somaari.in/<repo>/` is one app's guide, e.g. `docs.somaari.in/somaari-plan/#-installation`. Repo name, not a short name: it matches `/apps/<repo>/`, the card repo label and GitHub, and needs no mapping. |
| D5 | Heading ids | GitHub's (`github-slugger`), so `#-installation` and `#ai` survive the redirect. |
| D6 | Private repos | **Public repos only** for now: an app's guide is published once its repo is public. somaari-server stays unpublished. Revisit with a read-only token when a private app needs public docs. |
| D7 | Manifest home | **somaari-common** `apps/apps.json` (+ JSON Schema, + tests): it is already the "single source of truth for what somaari apps share". Both sites fetch it at build time from `main`. |
| D8 | Theme picker | The somaari Appearance control and `theme.js` from somaari-common replace Starlight's light/dark toggle. |
| D9 | Redirect | `somaari-site/_redirects`: `/apps/:repo/docs/* https://docs.somaari.in/:repo/:splat 301`. Removed pages and the redirect ship in the same deploy. |
| D10 | Multi-page guides | Out of scope now (`src` is one file). The import step should keep `src` as a path so a folder can be supported later. |
| D11 | Rebuild trigger | **A cron job on the Pi, not deploy hooks.** `scripts/refresh.sh` runs hourly through `somaari-server run-job somaari-docs`. It compares the latest commit SHAs of each guide, the somaari-common `theme/` and (after Stage 7) `apps/` with `.state/last-shas.json`, and rebuilds and deploys only when one changed. So no `SOMAARI_DOCS_DEPLOY_HOOK` secret is needed anywhere, and the app repos' workflows stay as they are. Added 2026-11-09. |
| D12 | Failures | `scripts/notify.sh` opens or updates one GitHub issue in somaari-docs with the failing step and the last 50 log lines; the next good run closes it. A failed build or check never deploys, so the last good site stays online. Added 2026-11-09. |

## Stages

### Stage 0: Owner prep (OWNER, no Claude)

- [x] Read the Decisions table; change anything you disagree with. (2026-11-03: all accepted, no changes.)
- [x] Create the empty GitHub repo `ashwinkrpi/somaari-docs` (public) and clone it to `~/code/ai-projects/somaari-docs`. (2026-11-03)
- [x] Confirm `somaari.in` DNS is on Cloudflare (it is for somaari-site) so `docs.` can be added as a Pages custom domain in Stage 4. (2026-11-03: nameservers `gabe` and `molly.ns.cloudflare.com`.)

### Stage 1: Spike: Starlight with the somaari themes and the strict CSP

Repo: somaari-docs. Goal: prove or rule out D1 before building on it.

- [ ] Scaffold Starlight (latest Astro and Starlight; Node per the blog's `engines`). Site `https://docs.somaari.in`. Disable Starlight's default social links and edit links for now.
- [ ] Put `somaari-plan/docs/GUIDE.md` in by hand (temporary, not committed) as `src/content/docs/somaari-plan/index.md` to test with real content.
- [ ] Themes: load `/theme/theme.js` (blocking, in `<head>`) and `/theme/themes.css` from a local copy of somaari-common `theme/` (temporary: copy `theme/` into `public/theme/`). Map somaari tokens onto Starlight's `--sl-color-*` variables in one CSS file for all four themes.
- [ ] **Check the `data-theme` clash:** Starlight sets `html[data-theme="dark"|"light"]`; somaari's `theme.js` sets `html[data-theme="<theme id>"]`. Override Starlight's `ThemeProvider`/`ThemeSelect` components (or whatever the current version uses) so only somaari's attribute is set, and each somaari theme maps to Starlight's light or dark base. Record how in the notes.
- [ ] **Check the CSP:** add `public/_headers` with somaari-site's CSP. Build, then serve with `npx --yes wrangler@4 dev` (a minimal `wrangler.jsonc` with `assets.directory: "./dist"`; it applies `_headers`). Open the page and the search in a headless browser and list every CSP violation from the console. Starlight's inline scripts and Pagefind's WebAssembly are the expected problems. Try, in order: Astro's built-in CSP support (hashes for inline scripts and styles), moving inline scripts to files via component overrides, adding `'wasm-unsafe-eval'` to `script-src` for Pagefind only. Nothing that allows `'unsafe-inline'` scripts.
- [ ] **Check heading ids:** `## 📦 Installation` must get `id="-installation"` and the plan guide's AI heading `id="ai"`.
- [ ] **Check external requests:** none (fonts, scripts, images all from `docs.somaari.in`), except Cloudflare Web Analytics if added.
- [ ] Write `somaari-docs/SPIKE.md`: each check pass/fail, what was overridden, the final CSP string.

- [ ] Add `.gitignore` (`node_modules/`, `dist/`, `.astro/`, `.wrangler/`, `.state/`, `.env*`, the generated guide folders, `public/theme/`) and a headless smoke script `scripts/smoke.mjs <url>` (Playwright: page loads, search opens, no console errors or CSP violations). Later stages reuse it.

Done when: SPIKE.md says Starlight passes all four checks (themes incl. data-theme, CSP without `'unsafe-inline'` scripts, heading ids, no external requests), **or** it explains why not and Stage 2 continues with the fallback (D1). Don't commit the copied guide or the copied `theme/`.

### Stage 2: Import the guides at build time

Repo: somaari-docs. Assumes Stage 1 passed (for the fallback, do the same inside the plain generator).

- [ ] `docs.config.json` in somaari-docs, same shape as somaari-site's (`owner`, `apps[{repo, ref, src}]`) with disk, plan, trip. It is replaced by the manifest in Stage 7.
- [ ] `scripts/import-guides.mjs`, run before `astro build` (`"build": "node scripts/import-guides.mjs && astro build"`). For each app, fetch `src` from `raw.githubusercontent.com` (or `--local <dir>` like today) and write `src/content/docs/<repo>/index.md` plus its images into the same folder. Port these rules from `somaari-site/scripts/build-docs.mjs` `render()`, applied to Markdown instead of HTML where possible:
  - strip `<!-- site:skip -->…<!-- /site:skip -->` and `banner.svg` images
  - move the guide's first `# H1` into frontmatter `title` (Starlight renders its own title); `description` = "How to install, set up and use <name> (<repo>)."
  - GitHub alerts → Starlight asides (`:::note`, `:::tip`, `:::caution`, `:::danger`); map IMPORTANT→note, WARNING→caution, CAUTION→danger
  - links: same as `rewriteLink()`, but published guides become `/<repo>/` instead of `/apps/<repo>/docs/`
  - images: same as `rewriteImage()`; only from inside the guide's folder
  - **fail the build** (exit 1) on the same four conditions as today, plus a guide whose detail page doesn't exist is no longer an error
  - keep the self-hosting check on text and SVGs
- [ ] `scripts/check.mjs` (`npm run check`), run after the build. It grows each stage; start with the anchor check: scan `dist/**/*.html` for `href="#…"` and `href="/<repo>/#…"` targets that don't exist; fail if any. (Starlight's own ids decide this now, so check the output, not the Markdown.)
- [ ] Generated files under `src/content/docs/<repo>/` are git-ignored. Commit only the script and config.
- [ ] Each guide page shows "This guide is kept in the <repo> repository on GitHub. View it on GitHub" (as today's `page()`), via a Starlight component override or frontmatter field.
- [ ] Sidebar: one entry per app, label = app title, in manifest order.
- [ ] `docs.somaari.in/` (index page): one line per app with its title and a link to its guide and to its `somaari.in/apps/<repo>/` detail page.

Done when: `npm run build` downloads the three guides from GitHub and builds; `npm run build -- --local ~/code/ai-projects` builds from disk; each failure rule has a test or a documented manual check (e.g. a fixture guide that says "self-hosted" makes the build exit 1); the anchors `/somaari-plan/#-installation`, `/somaari-plan/#ai`, `/somaari-trip/#-installation` exist.

### Stage 3: Shared look, header, footer, and site files

Repo: somaari-docs.

- [ ] Theme files fetched at build time from somaari-common `theme/files.json` into `public/theme/`, like `theme()` in build-docs.mjs, with the same `?v=<hash>` stamping as `stampThemeVersions()`. `--local` reads `~/code/ai-projects/somaari-common/theme/`. Remove the Stage 1 copy.
- [ ] Header: override Starlight's header so it carries somaari-site's logo, nav (Apps → `https://somaari.in/#apps`, About → `https://somaari.in/about/`, GitHub), the Appearance control, plus Starlight's search. Footer: the same links as somaari-site's footer, with absolute `https://somaari.in/...` URLs.
- [ ] `public/_headers`: the CSP settled in SPIKE.md + the other somaari-site headers.
- [ ] `robots.txt` with `Sitemap: https://docs.somaari.in/sitemap-index.xml` (or whatever Starlight's sitemap is); 404 page in the somaari style; favicon from somaari-site.
- [ ] Cloudflare Web Analytics the same way somaari-site loads it (check its `index.html`), if allowed by the CSP.
- [ ] `README.md`: what this repo is, how guides get here, the failure rules, local preview (`npm run build -- --local ~/code/ai-projects` then `npx --yes wrangler@4 dev`), how to add an app.
- [ ] Extend `npm run check`: the `_headers` CSP is present and has no `'unsafe-inline'` in `script-src`; every `src`/`href` in `dist/` is same-origin or an allowed absolute link (somaari.in, blog.somaari.in, github.com); no "self-host" wording.

Done when: `npm run check` passes; `scripts/smoke.mjs` passes for each of the four themes (`?theme=warm-tactile`, `liquid-glass`, `dasara-jamboo`, `rajyotsava`) on a guide page and the index, with a screenshot of each saved under `reports/stage-3/` and listed in `SPIKE.md`; `wrangler dev` shows no CSP violations; axe has no new accessibility errors compared to `somaari.in/apps/somaari-plan/docs/` (write both counts to `reports/stage-3/axe.md`).

### Stage 4: Deploy docs.somaari.in

Repo: somaari-docs. No owner steps: wrangler on the Pi is already logged in (somaari-blog and somaari-games deploy the same way), and `somaari.in` DNS is on Cloudflare.

- [ ] `wrangler.jsonc`: `name: "somaari-docs"`, `assets.directory: "./dist"`, `not_found_handling: "404-page"`, `routes: [{ pattern: "docs.somaari.in", custom_domain: true }]`, `workers_dev: true`, `preview_urls: true`. Copy the shape from `../somaari-blog/wrangler.jsonc`.
- [ ] `scripts/deploy.sh`: `npm ci --silent && npm run build && npm run check` → `wrangler versions upload` → `scripts/smoke.mjs <preview URL>` → `wrangler deploy` → `scripts/smoke.mjs https://docs.somaari.in/` → `wrangler rollback` if that fails. Exit non-zero on any failure.
- [ ] Run it. Then verify the live site: each guide loads, the three anchors exist, `curl -sI` shows the `_headers`, no external requests (fetch the HTML and check every `src`/`href` host), the sitemap lists the three guides.
- [ ] If wrangler can't attach the custom domain (missing permission), open an issue listing the exact **OWNER** step (`npx wrangler login` again, or add the domain under Workers → somaari-docs → Domains). Don't stop: carry on with Stage 5 using the `workers.dev` URL, and hold Stage 6 until the custom domain answers.

Done when: docs.somaari.in serves all three guides and passes the checks. somaari.in is unchanged (both sites serve the guides for now).

### Stage 5: Rebuild automatically from the Pi

Repo: somaari-docs. Replaces the deploy-hook plan (D11), so the app repos need no changes and no new secrets.

- [ ] `scripts/refresh.sh`: get the latest commit SHA for each guide's `src` (`gh api repos/<owner>/<repo>/commits?path=<src>&per_page=1`), for somaari-common `theme/`, and for `apps/` once Stage 7 lands. Compare with `.state/last-shas.json`. If anything changed, or `FORCE=1` is set, run `scripts/deploy.sh` and save the new SHAs only after it succeeds. Log to `.state/refresh.log`.
- [ ] `scripts/notify.sh <step> <logfile>`: opens or updates one issue labelled `refresh-failed` with the step and the last 50 log lines; `notify.sh --ok` closes it. Call both from `refresh.sh`.
- [ ] Cron: `23 * * * * /home/ashwin/.local/bin/somaari-server run-job somaari-docs -- /home/ashwin/code/ai-projects/somaari-docs/scripts/refresh.sh` (add it with `crontab -l | { cat; echo '...'; } | crontab -`; never `crontab -r`).
- [ ] Prove it: run `refresh.sh` twice (the second run must skip), then `FORCE=1 bash scripts/refresh.sh` (must deploy). Break the build on purpose (a fixture guide with "self-hosted") with `--local`, confirm an issue opens and the live site is unchanged, then revert and confirm the next run closes the issue.

Done when: the cron line is installed, the four runs above behave as described, and README has a "How the site stays up to date" section.

### Stage 6: Move somaari.in over (redirects, links, remove guide pages)

Repo: somaari-site. All of this ships in one deploy.

- [ ] `_redirects`: `/apps/:repo/docs/* https://docs.somaari.in/:repo/:splat 301`. Add `_redirects` to `PUBLISH` in `build-docs.mjs`.
- [ ] `build-docs.mjs`: delete `render()`, `page()`, the guide loop and the docs sitemap URLs, and the `marked`, `sanitize-html`, `github-slugger` dependencies if nothing else uses them. Keep `theme()`, `screenshots()`, `demo()`, `stampThemeVersions()`. Rename the script to `scripts/build.mjs` and update `package.json`. `docs.config.json` keeps only `screenshot`/`demo` entries (`src` removed).
- [ ] Detail pages: "Installation guide" → `https://docs.somaari.in/<repo>/#-installation`, "Read the guide" → `https://docs.somaari.in/<repo>/`, plan's AI link → `https://docs.somaari.in/somaari-plan/#ai`.
- [ ] `about/index.html:89`: point "a guide" at docs.somaari.in.
- [ ] Shared header: add "Docs" (`https://docs.somaari.in/`) after Apps. Shared footer: add "Docs" next to Blog. Paste into every page; `npm run check` must pass.
- [ ] `_headers` CSP: nothing to add (links don't need CSP), but check no page loads anything from docs.somaari.in.
- [ ] README: replace "App guides" and "Publish an app's guide" with a short pointer to somaari-docs; update the Files table.
- [ ] Keep `scripts/app-docs-workflow.yml` and the app repos' `site-docs.yml`: they still rebuild somaari.in for screenshots and demos. Only update the template's top comment to say docs.somaari.in picks up guide changes by itself (D11).
- [ ] Local check: `npm run build`, then `npx wrangler pages dev dist` and confirm `/apps/somaari-plan/docs/#-installation` → 301 → `https://docs.somaari.in/somaari-plan/` (the browser keeps `#-installation`); `/apps/somaari-plan/` still serves the detail page; `/apps/somaari-plan/docs/images/x.png` redirects too.

Done when: the build has no guide pages, the redirect works locally, `npm run check` passes, and `grep -rn "/docs/" --include=*.html .` finds no links to the old guide URLs. Then merge the PR yourself; once the Pages deploy finishes (`gh api` the commit status, or poll `curl -sI` for up to 10 minutes), check live that `curl -sI https://somaari.in/apps/somaari-plan/docs/` returns 301 to `https://docs.somaari.in/somaari-plan/` and that each detail page returns 200. If it fails, revert the merge with a new PR and open an issue. Optional for the owner: resubmit the sitemap in Google Search Console.

### Stage 7: One app manifest in somaari-common

Repos: somaari-common, somaari-docs, somaari-site.

- [ ] somaari-common `apps/apps.json` + `apps/apps.schema.json`. One entry per app, in display order. Fields (derive the values from today's cards and `docs.config.json`; don't invent copy):
  - `repo`, `title` (card title, e.g. "Task Planner"), `status` (`live` | `dev` | `soon`), `public` (bool)
  - `description`, `tags[]`
  - `ai`: `{ "label": "No AI" | ..., "source": "<the source note in today's HTML comment>" }`
  - `detail_page` (bool), `demo` (`{ "ref": "site-demo" }` or a path-based form, as today), `screenshot` (as today)
  - `guide`: `{ "ref": "main", "src": "docs/GUIDE.md" }` or absent (no published guide)
- [ ] Tests in somaari-common (`tests/`, pytest, like the theme tests): the file validates against the schema; repos are unique; `guide` only when `public`; every `live` app has a `detail_page`.
- [ ] somaari-common workflow `site-apps.yml`: on a push to `apps/**` on `main`, run the tests, then POST `SOMAARI_SITE_DEPLOY_HOOK` (the secret already exists for `site-theme.yml`). The docs site needs no hook: its cron watches `apps/` and `theme/` (D11).
- [ ] somaari-docs: read the manifest (from GitHub `main`, or `--local`) instead of its own `docs.config.json`; publish every app with a `guide`; delete `docs.config.json`. Add `apps/` to the SHAs `refresh.sh` watches, and have it watch the guide of every manifest app with a `guide`.
- [ ] somaari-site: read the manifest for `screenshot`/`demo`; delete `docs.config.json`.
- [ ] somaari-common README: add "apps" to the list of what it holds.

Done when: both sites build from the manifest with the same output as before (diff `dist/` before/after; only expected differences), and the somaari-common tests pass.

### Stage 8: Generate the landing page cards from the manifest

Repo: somaari-site.

- [ ] In `index.html`, replace the hand-written cards with two markers per list, e.g. `<!-- APPS:live -->…<!-- /APPS:live -->` and `<!-- APPS:dev -->…<!-- /APPS:dev -->`. The build fills them from the manifest; `soon` apps go in the "In development" list with `badge--soon`.
- [ ] The card template lives in `scripts/build.mjs` and produces the **same HTML as today's cards**: same classes, same visually-hidden spans, AI source as an HTML comment, "View on GitHub" only for `public`, "Details" only with `detail_page`. Escape all text.
- [ ] Prove it: build before and after, extract the `<ul class="card-grid">` blocks from `dist/index.html`, and diff them (whitespace-insensitive). The diff must be empty.
- [ ] Replace the "HOW TO ADD AN APP CARD" comment with a one-line pointer to somaari-common `apps/apps.json`.
- [ ] Only `dist/` is served, so the source `index.html` may hold just the markers. `npm run check` reads the source pages; make sure it still passes.
- [ ] `sitemap.xml`: generate the `/apps/<repo>/` entries from the manifest (`detail_page: true`) instead of by hand.
- [ ] README: "Adding an app" section: manifest entry → detail page (`apps/<repo>/index.html`) if live → `docs/GUIDE.md` in the app repo + `site-docs.yml` from the somaari-docs template + the two secrets.

Done when: the card diff is empty, `npm run check` passes, and adding a test entry to a local copy of the manifest (with `--local`) makes a new card appear in the right list.

### Stage 9: Blog and project index

Repos: somaari-blog, `~/code` (project index).

- [ ] somaari-blog: add "Docs" (`https://docs.somaari.in/`) to the header/footer where it links to somaari.in today. Check its CLAUDE.md for the header rules. After the PR merges, deploy with `npm run deploy` and `curl -s https://blog.somaari.in/ | grep -c docs.somaari.in`.
- [ ] `~/code/project-logs/projects.toml`: add somaari-docs (path, category "Somaari apps", description, stack "Astro, Starlight, Cloudflare Pages"); update the somaari-site and somaari-common descriptions (no longer renders guides; now holds the app manifest). Then run `python3 ~/code/scripts/project-index/update_project_index.py`.

Done when: the blog links to the docs site and `~/code/PROJECTS.md` lists somaari-docs.

## Adding an app after the migration (target workflow)

1. Add the app to somaari-common `apps/apps.json` (status `dev` or `soon` until it ships).
2. When it's public and has a guide: write `docs/GUIDE.md` in its repo and add `"guide"` to its manifest entry. docs.somaari.in picks it up within the hour (D11). Copy `site-docs.yml` from the somaari-site template and add `SOMAARI_SITE_DEPLOY_HOOK` only if somaari.in shows its screenshots or demo.
3. When it's live: write `somaari-site/apps/<repo>/index.html` (detail page), set `status: live` and `detail_page: true`.

No step involves copying text between repos.

## Out of scope

- Multi-page guides per app (D10); versioned docs; translated docs.
- Publishing somaari-server's guide (private repo, D6) and somaari-terminal's (in development; publish when it moves to "Apps").
- NadiChart docs: separate product, separate site (see `~/code/work/nadichart/docs/DOCS_RESTRUCTURE_PLAN.md`).
- somaari-terminal's own GitHub Pages site (`site/`, `pages.yml`); decide later whether it folds into docs.somaari.in.

## Progress

- [x] Stage 0: Owner prep (2026-11-03)
- [x] Stage 1: Starlight spike (2026-11-09: passes all four checks, see SPIKE.md)
- [ ] Stage 2: Import the guides
- [ ] Stage 3: Shared look and site files
- [ ] Stage 4: Deploy docs.somaari.in
- [ ] Stage 5: Rebuild automatically from the Pi
- [x] Stage 6: Move somaari.in over (2026-11-13, somaari-site #13)
- [ ] Stage 7: App manifest in somaari-common
- [ ] Stage 8: Cards from the manifest
- [ ] Stage 9: Blog and project index

Notes:
- Stage 1: `wrangler dev` can't run on the Pi (workerd needs a 48-bit address space). Use `npm run preview` (`scripts/serve.mjs`, applies `_headers`) wherever this plan says `wrangler dev` or `wrangler pages dev`. Five themes now: `deepa` was added after the plan was written; check it wherever the plan lists four. `npm run smoke` already covers Stage 3's per-theme screenshot and CSP checks.
- Stage 6: also added `/apps/:repo/docs` (no trailing slash) to `_redirects`, and "Docs" to the 404 footer. The redirect was checked on the Pages preview and live, not with `wrangler pages dev` (can't run on the Pi). docs.config.json now lists only somaari-plan (the only app with a screenshot/demo).
