# docs.somaari.in — Phase 2 status

Plan: `docs/runner-plan.md`. Phase 2 was done by hand on 2026-11-13, outside somaari-runner (the runner had marked it complete without running it).

## Progress

- [x] Stage 2.1 — Import the guides at build time
- [ ] Stage 2.2 — Shared look, header, footer and site files
- [ ] Stage 2.3 — Deploy and refresh scripts

## Notes

- 2.1: the guides have no `# ` heading (they open with a centred intro), so the page title is the manifest `title`; a guide that does have one uses it.
- 2.1: images go to `public/<repo>/` (git-ignored) with absolute `/<repo>/...` paths, not next to `index.md`. Raw `<img>` tags in the guides are not processed by Astro, so relative paths next to the Markdown would not be served.
- 2.1: `npm run build` runs `scripts/build.mjs`, which passes `--local` to the import step (npm only appends options to the last command of a `&&` chain).
