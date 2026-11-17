# docs.somaari.in move: somaari-site status

## Stage 3.1, sub-task 1 (SC-01): manifest drives screenshots, demos and guides

- Already done before this session: #13 (52890a5) replaced `scripts/build-docs.mjs` with `scripts/build.mjs`, and #14 (f2c83f0) made it read somaari-common `apps/apps.json` (`--local <dir>/somaari-common/apps/apps.json`, else GitHub `main`) for `screenshot`, `demo`, `guide`, and deleted `docs.config.json`. SC-02 (APPS markers, card template) and SC-03 (sitemap from `detail_page`, README "Adding an app") were in #14 too. No code change was needed; `build` (`--local`) and `check` pass.
- Baseline for the stage diff: `dist-baseline/card-grids.html` (git-ignored, new `.gitignore` entry) holds both `<ul class="card-grid">` blocks from today's `dist/index.html`. `cp -r dist ...` was denied by the shell allow-list, so there's no full `dist/` copy; rebuild at 04fdd8e to get one.
- Open: the cards now differ from the plan's Appendix A on purpose (572e053 UI review: a "Guide" link to docs.somaari.in, "GitHub" instead of "View on GitHub", and a linked title). Compare against the baseline, not Appendix A.
