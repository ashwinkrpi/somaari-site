# Stage 1 spike: Starlight with the somaari themes and the strict CSP

Date: 2026-11-09. Astro 7.4.7, Starlight 0.42.10, Node 24. **Result: Starlight passes all four checks.** Stage 2 builds on it (no fallback).

| Check | Result |
|---|---|
| Themes, including the `data-theme` clash | Pass: all 5 themes (deepa has been added since the plan was written) |
| CSP without `'unsafe-inline'` scripts | Pass: no `'unsafe-inline'` at all, for scripts or styles |
| Heading ids | Pass: `## 🚀 Installation` → `id="-installation"`, `### AI` → `id="ai"` (Astro already uses github-slugger) |
| No external requests | Pass: every request is same-origin (Cloudflare Web Analytics isn't added yet) |

Verified by `node scripts/smoke.mjs http://127.0.0.1:8787`: 5 themes × 2 pages (`/`, `/somaari-plan/`). It fails on a console error, a CSP violation, an external request, an HTTP error, a wrong Starlight base, a hidden Appearance control, text contrast under 4.5:1 on the header or guide text, or a search with no results. A separate run checked that choosing a theme in the Appearance menu switches it live and keeps it after a reload. Screenshots are in `reports/stage-1/` (git-ignored).

## Themes

- **Clash.** Starlight sets `html[data-theme="light"|"dark"]` and styles its light palette with `[data-theme='light']` selectors in about 8 places (props, reset, util, search, mobile menu, badge). somaari's `theme.js` sets `data-theme` to a theme id, so Starlight would always be dark.
- **Fix.** somaari keeps `data-theme`. `scripts/postbuild.mjs` renames every Starlight `[data-theme=light|dark]` selector in `dist/` (CSS, JS and the `<html>` attribute) to `[data-sl-theme=…]`. `public/sl-theme-bridge.js`, a blocking classic script after `themes.css` and `theme.js`, sets `data-sl-theme` from the active theme's computed `color-scheme`, at load and on every `somaari-theme` event. So no theme → light/dark map is hard-coded.
- **Overrides.** `ThemeProvider` → empty component (its inline script is no longer needed). `ThemeSelect` → the somaari Appearance control, with the same markup as somaari-site; its CSS is ported into `src/styles/somaari.css`.
- **Tokens.** `src/styles/somaari.css` maps somaari tokens onto `--sl-color-*` once for all themes (`--fg`, `--accent`, `--line`, `--muted`, and a new `--surface` for Starlight's header, sidebars and dialogs). Following THEME_SPEC section 4, the tokens that are "app" in its table (`--page-bg`, `--line`, `--surface`, `--field-bg`, `--muted`) are set per theme in that file, copied from somaari-site's `style.css`. A new theme needs one block there. Starlight's CSS is in a cascade layer, so these unlayered rules win without `!important`.
- Starlight moves `<meta name="theme-color">` after `theme.js`, so `theme.js` can't update it. The bridge copies `--surface` into it after DOMContentLoaded.

## CSP

Final `Content-Security-Policy` (in `public/_headers`). It is somaari-site's, minus `frame-src` (no embeds), plus `'wasm-unsafe-eval'`:

```
default-src 'self'; img-src 'self'; style-src 'self'; font-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
```

What the plain Starlight build broke, and how each is handled:

| Problem | Fix |
|---|---|
| 10 inline `<script>`s per page | 4 removed by the ThemeProvider/ThemeSelect overrides. `postbuild.mjs` moves the other 6 (search shortcut, sidebar state, mobile TOC…) into `/_astro/inline/<hash>.js`, in place: classic stays classic and blocking, modules stay modules. Same timing, no component overrides to maintain. |
| Hundreds of `style="--0:…"` from Expressive Code | `expressiveCode: false` and `markdown.syntaxHighlight: false`. somaari.in's guides aren't highlighted either. |
| 6 distinct `style=""` attributes from Starlight (icon size, TOC `--depth`, search dialog) | `postbuild.mjs` replaces each with `data-sa="<hash>"` plus a rule in `/_astro/inline/attrs.css`. The rule is unlayered, so it beats Starlight's layered CSS as the attribute did, and JS that sets `.style` still wins. |
| `data:` SVG icons in Starlight's and Pagefind's CSS (`img-src 'self'`) | `postbuild.mjs` lifts them into `/_astro/inline/img-<hash>.svg`. |
| Pagefind's WebAssembly | `'wasm-unsafe-eval'` in `script-src`. This allows compiling WebAssembly only, not `eval()` of JS or inline scripts. |

`postbuild.mjs` exits 1 if any inline script or style, `style=""`, `data:` image in CSS, or old selector is left, so a Starlight upgrade that adds one fails the build instead of breaking the live site.

Astro's built-in CSP (hashes in a `<meta>`) was not used. It can't hash `style=""` attributes without `'unsafe-hashes'`, and a `<meta>` CSP alongside the `_headers` one would have to repeat every hash in `_headers`.

## Differences from the plan

- `wrangler dev` can't run on this Pi: workerd aborts in TCMalloc, which needs a 48-bit address space. `scripts/serve.mjs` (Node built-ins only) serves `dist/` and applies `dist/_headers` the way Cloudflare does. `npm run preview` runs it. Stage 4 repeats the smoke test against the real Cloudflare preview URL.
- Smoke tests use `playwright-core` (a dev dependency) with the system Chromium (`/usr/bin/chromium`, override with `CHROMIUM=`), so no browser is downloaded.
- The favicon was copied from somaari-site now instead of in Stage 3.
- Not committed (git-ignored): the hand-copied guide in `src/content/docs/somaari-plan/` and its images in `public/somaari-plan/`, and the copied `public/theme/`. To rebuild locally before Stage 2, copy them as in the Stage 1 steps.
