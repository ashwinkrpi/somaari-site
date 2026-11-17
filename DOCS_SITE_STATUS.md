# docs.somaari.in move: somaari-site status

## Stage 3.1, sub-task 1 (SC-01): manifest drives screenshots, demos and guides

- Already done before this session: #13 (52890a5) replaced `scripts/build-docs.mjs` with `scripts/build.mjs`, and #14 (f2c83f0) made it read somaari-common `apps/apps.json` (`--local <dir>/somaari-common/apps/apps.json`, else GitHub `main`) for `screenshot`, `demo`, `guide`, and deleted `docs.config.json`. SC-02 (APPS markers, card template) and SC-03 (sitemap from `detail_page`, README "Adding an app") were in #14 too. No code change was needed; `build` (`--local`) and `check` pass.
- Baseline for the stage diff: `dist-baseline/card-grids.html` (git-ignored, new `.gitignore` entry) holds both `<ul class="card-grid">` blocks from today's `dist/index.html`. `cp -r dist ...` was denied by the shell allow-list, so there's no full `dist/` copy; rebuild at 04fdd8e to get one.
- Open: the cards now differ from the plan's Appendix A on purpose (572e053 UI review: a "Guide" link to docs.somaari.in, "GitHub" instead of "View on GitHub", and a linked title). Compare against the baseline, not Appendix A.

## Stage 3.1, sub-task 2 (SC-02): landing cards from the manifest

- Already done (#14): `index.html` has empty `<!-- APPS:live -->`/`<!-- APPS:dev -->` markers and a one-line pointer to `apps/apps.json` in place of "HOW TO ADD AN APP CARD". `card()` in `scripts/build.mjs` fills them: `soon` goes in the dev list as `badge--soon`, all text is escaped with `escapeHtml`, the AI source is an HTML comment (fails on `--`/`>`), the GitHub link appears only when `public`, and Details only with `detail_page`.
- Verified: `build` (`--local`) and `check` pass, and `diff -w -B dist-baseline/card-grids.html dist/index.html` only adds lines, so both card-grid blocks match the baseline. No code change, no files added.
- Open: none for SC-02. SC-03 (sitemap and README) still needs its own check in sub-task 3.

## Stage 3.1, sub-task 3 (SC-03): sitemap and README from the manifest

- Already done (#14): `sitemap.xml` holds a `<!-- APPS -->` line that `cards()` in `scripts/build.mjs` replaces with one `/apps/<repo>/` entry per `detail_page: true` app (`<lastmod>` from the page's last commit). The build fails if the manifest names a detail page whose `apps/<repo>/index.html` is missing. Built `dist/sitemap.xml` has somaari-trip, somaari-disk, somaari-plan (the three `apps/*/index.html` pages).
- README "Adding an app" already runs manifest entry → detail page once live → `docs/GUIDE.md` in the app repo. Changed only step 1's link names to match the cards ("Guide" with `"guide"`, "GitHub" instead of "View on GitHub").
- Verified: `build` (`--local`) and `check` pass; the card-grid baseline diff still only adds lines. No files added. Open: the expected `dist/` differences for sub-task 4 are the sitemap app entries (now from the manifest, same three URLs) and nothing else from SC-03.

## Stage 3.1: verified

- Verified: `build` (`--local`) and `check` pass; `diff -w -B dist-baseline/card-grids.html dist/index.html` shows no changed or removed lines, so both card-grid blocks match. SC-01–SC-03 were already in #14; `docs.config.json` and `build-docs.mjs` are gone.
- Added: `card()` now escapes `repo` and the owner too (and the sitemap `<loc>`); RU-02 rewording of "self-hosted" in the `video.js` and `apps/somaari-trip/` comments (both published) and in README, with new `?v=` stamps on the three detail pages. Cards render byte-for-byte as before.
- Expected `dist/` differences: sitemap app entries (same three URLs, from the manifest), the two comments, and the `video.js?v=` hash on the detail pages. No full `dist/` copy was possible to diff (`cp -r dist` was denied), so the rest is checked by reading the code.
- Open: `dist/theme/themes.css` (from somaari-common, not editable here) still says "self-hosted" in a comment: fix it in somaari-common. Browser check before merging: the landing cards (live and In development) in all four themes, and "Play demo" on a card.

## Stage 3.2, sub-task 1 (SM-01): redirect the guides, build without them

- Already done (#13, 52890a5): `_redirects` (in `PUBLISH`) has `/apps/:repo/docs/* https://docs.somaari.in/:repo/:splat 301`, plus `/apps/:repo/docs` → `https://docs.somaari.in/:repo/` for the URL without a trailing slash. `build-docs.mjs` is now `scripts/build.mjs` with no `render()`, `page()`, guide loop or docs sitemap URLs; `theme()`, `screenshots()`, `demo()`, `stampThemeVersions()` are kept. `package.json` runs `node scripts/build.mjs`. No code change, no files added.
- Verified: `build` (`--local`) and `check` pass; `dist/apps/*/` holds only `index.html` (no `docs/`); `dist/_redirects` has the rule; no `/apps/<repo>/docs/` link in any HTML outside `dist/` (only in `_redirects`, README and a `build.mjs` comment).
- Open: the plan said to keep `marked`, `sanitize-html` and `github-slugger` in `package.json`, but #13 had already removed them and their `package-lock.json` entries. All three are unused. They were not added back: that would need `npm install` to update the lockfile, and without it Cloudflare's `npm ci` would fail. SM-02/SM-03 look already done in #13 too (Docs links, header/footer); their sub-tasks should check.

## Stage 3.2, sub-task 2 (SM-02): detail page and About links to docs.somaari.in

- Already done (#13, then ba4367b): each detail page has one "Documentation" button to `https://docs.somaari.in/<repo>/` (main action on plan and trip, secondary next to Download on disk). ba4367b deliberately merged "Installation guide" (`#-installation`) and "Read the guide" into it, and README "Add an app detail page"/"App guides" say to keep one link. The plan page's AI link goes to `https://docs.somaari.in/somaari-plan/#ai`, and About (now line 99) links "guide" to `https://docs.somaari.in/`.
- Verified: `build` (`--local`) and `check` pass; no `/apps/<repo>/docs/` or `#-installation` link in any source HTML; built detail pages have the docs.somaari.in links. No code change, no files added.
- Open: the separate "Installation guide" link was not brought back, because that would undo ba4367b and change how the pages look. If it's wanted, add `https://docs.somaari.in/<repo>/#-installation` next to Documentation.

## Stage 3.2, sub-task 3 (SM-03): header, footer, README and workflow point at docs.somaari.in

- Already done (#13): the shared header has "Docs" (`https://docs.somaari.in/`) after Apps, and the shared footer has "Docs" before Blog, on all 7 checked pages (404.html has it too). README "App guides" points to somaari-docs (there's no "Publish an app's guide" section any more), and the Files table lists `scripts/build.mjs`, `_redirects` and the workflow. The workflow's top comment already says docs.somaari.in picks up guide changes by itself.
- Changed: `scripts/app-docs-workflow.yml` only. Its `name:` is now "Rebuild somaari.in for screenshots and demos" (was "Update the guide on somaari.in"), and the comment on the guide wording check no longer says the site build runs the same check, because it doesn't any more. No files added.
- Verified: `build` (`--local`) and `check` pass; `dist/apps/*/` holds only `index.html`; no `/apps/<repo>/docs/` link outside `dist/` and `node_modules/`.
- Open: app repos that already have `site-docs.yml` keep the old name until someone copies the template again (out of scope). The template's guide check, `scripts/demo/README.md` and `scripts/demo/somaari-trip/encode.sh` still contain self-host wording. That wording describes the check, isn't published and was already there; decide in sub-task 4 whether it counts as "anywhere".
