# docs.somaari.in — Phase 2 status

Plan: `docs/runner-plan.md`. Phase 2 was done by hand on 2026-11-13, outside somaari-runner (the runner had marked it complete without running it).

## Progress

- [x] Stage 2.1 — Import the guides at build time
- [x] Stage 2.2 — Shared look, header, footer and site files
- [ ] Stage 2.3 — Deploy and refresh scripts

## Notes

- 2.1: the guides have no `# ` heading (they open with a centred intro), so the page title is the manifest `title`; a guide that does have one uses it.
- 2.1: images go to `public/<repo>/` (git-ignored) with absolute `/<repo>/...` paths, not next to `index.md`. Raw `<img>` tags in the guides are not processed by Astro, so relative paths next to the Markdown would not be served.
- 2.1: `npm run build` runs `scripts/build.mjs`, which passes `--local` to the import step (npm only appends options to the last command of a `&&` chain).
- 2.2: header and footer follow somaari.in as it is now, which has YouTube in its nav and Games in its footer (added after the plan was written).
- 2.2: `npm run check` holds what pages *load* (src, srcset, `<link href>`, CSS `url()`) to the site's own origin. `<a>` links may go to other sites over https: the guides link to docs.astral.sh, typesafe.ai and others, as they did on somaari.in. An allow-list of hosts for every href would reject those.
- 2.2: the "self-host" scan skips `dist/theme/`. somaari-common's `themes.css` says "Fonts are self-hosted" in a comment; it is published unchanged on somaari.in too, and theme files are never edited here. Fix the comment in somaari-common.
- 2.2: the Appearance control is rendered once, in the header at every width. Starlight also put a copy in the mobile menu; theme.js only wires up the first `#theme-picker`, so on phones the visible copy never appeared (true since Stage 1).
- 2.2: code blocks and wide tables scroll inside the page (Expressive Code is off for the CSP, and without it long commands made the guide pages up to 1,500 px wide on a phone).
- 2.2: `scripts/smoke.mjs` measures header contrast on the new wordmark.

## Browser checks

Done locally on 2026-11-13 against `npm run preview` (`dist/` from `--local`):

- `npm run smoke`: all 5 themes × `/`, `/somaari-plan/`, `/somaari-trip/`, `/somaari-disk/`: no console errors, CSP violations, external requests or HTTP errors; header and text contrast ≥ 4.5; search finds results.
- Phone (390 px): no horizontal scroll on any page; the mobile menu shows the sidebar and the nav; the Appearance control opens and switches theme.

Still to do:

- The smoke test against the Cloudflare preview URL and https://docs.somaari.in/ (`scripts/deploy.sh` runs both).
- Accessibility (axe) counts per theme.

