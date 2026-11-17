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
