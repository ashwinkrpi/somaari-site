<!-- bg: branch build-guru/PLAN -->
# Somaari site improvements: docs

Part E of `somaari-website/somaari-site-improvements-plan.md` (in the somaari-website folder). Shared files
are already in the repo: `scripts/fetch-network.mjs` (from somaari-site), a committed `network.json`
fallback, and reference copies of somaari-site's `partials.mjs`, `nav.js` and `style.css` in
`vendor/somaari-site/` (see its README).

This plan is run by build-guru on its own branch. It is not a stage of `docs-subdomain-plan.md`: don't
commit, push or deploy (build-guru commits after the checks pass; Ashwin merges and deploys), and don't
tick that plan's Progress. Every other CLAUDE.md rule applies: strict CSP (read `SPIKE.md` before
touching inline scripts or the theme bridge), no external requests, never hand-edit the theme files.

### Shared header and footer
- [x] [moderate] Replace the docs header nav and footer with the shared Somaari header, "Somaari sites" switcher and footer built from `network.json`, with Docs highlighted (site id `docs`). Keep Starlight's search, sidebar, `ThemeSelect` and mobile menu (`MobileMenuFooter`). <!-- bg: done sonnet 2026-11-18 -->
    Not a docs-subdomain-plan stage: don't commit, push or deploy.
    Refresh `network.json` at the start of `scripts/build.mjs` the way `node scripts/fetch-network.mjs` does (live copy, committed copy as fallback). Build the markup the way `header(network, "docs")` and `footer(network)` in `vendor/somaari-site/partials.mjs` do, with full `https://somaari.in/...` URLs, replacing `src/components/SiteNav.astro`'s hand-written links. Port styles from `vendor/somaari-site/style.css` onto the existing tokens, and the switcher behaviour from `vendor/somaari-site/nav.js` as a bundled script (no new inline script). Update CLAUDE.md and README where they describe the header and footer.

### Page details
- [x] [moderate] Show a "somaari / docs / <app>" breadcrumb above each guide's title, and a "Last updated" date for each guide: the date of the guide's latest commit in its own app repo (the build already reads each guide from GitHub, or from the sibling checkout with `--local`). Show no date when it can't be read; never use the build date. <!-- bg: done sonnet 2026-11-18 -->
    Not a docs-subdomain-plan stage: don't commit, push or deploy.
- [x] [simple] At the end of each guide, a "Was this helpful?" line with a link to open a GitHub issue in that app's repo, with the page title filled in (`https://github.com/<owner>/<repo>/issues/new?title=...`, URL-encoded). A plain link, no script. <!-- bg: done haiku 2026-11-18 -->
    Not a docs-subdomain-plan stage: don't commit, push or deploy.
- [x] [simple] Make the terminal app name `somaari-terminal` everywhere. <!-- bg: done claude 2026-11-18: nothing to change; no "ATAI" in src, docs or public, and the terminal has no guide yet -->

### UI polish and SEO
- [x] [simple] Friendly 404 page (`src/content/docs/404.md` or an override) with links to all sites from `network.json`. <!-- bg: done haiku 2026-11-18 -->
    Not a docs-subdomain-plan stage: don't commit, push or deploy.
- [x] [simple] Title pattern "Page · Somaari Docs" (today "Page | Somaari Docs"), canonical URLs, OG and Twitter tags on every page. `robots.txt` and the sitemap already exist; keep them. <!-- bg: done haiku→sonnet 2026-11-18 -->
    Not a docs-subdomain-plan stage: don't commit, push or deploy.

### Manual
- [x] [manual] Preview the branch (`npm run build && npm run preview`, then `npm run smoke -- http://127.0.0.1:8787`) on phone and desktop. <!-- done 2026-11-18: built on the branch; npm test, npm run check and the smoke test (4 themes, CSP, search) passed; checked in Chromium at desktop and 360 px -->
- [x] [manual] Merge into `main`, push, and deploy (`bash scripts/deploy.sh`, or FORCE=1 bash scripts/refresh.sh). <!-- done 2026-11-18: merged and pushed. deploy.sh's live smoke test failed twice and rolled back: the zone caches docs HTML (cf-cache-status HIT), so cached pages pointed at the other build's common.*.css. Deployed by hand (wrangler versions upload + deploy, smoke OK) with the previous build's common.nsXADoMB.css kept in dist/_astro. Purge the docs cache / add a cache-bypass rule for HTML. -->
