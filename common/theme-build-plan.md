# somaari themes in somaari-common: build plan

**Status (2026-10-19): implemented in all three working trees, not committed.** D1–D3 were decided as
recommended. Changes from the plan made during the work:
- somaari-site keeps its `html[data-theme=…]` selectors. Switching to `:root[…]` would have raised the
  specificity of its decoration rules for no gain, and no token is set in both places anyway.
- `showShots` moved to `shots.js`. The build marks per-theme images `data-shots`, so `shots.js` needs no
  copy of the default theme id.
- Onest gained Google Fonts' math and symbols subsets. Without them, self-hosting would have changed the
  site's ← in Liquid Glass. The trade-off is that somaari-plan's ← → ↗ ✓ ↻ in Liquid Glass now use Onest's
  glyphs, which slightly narrows its arrow buttons. That is the only visible change found.
- Tokens shared in every theme: `color-scheme --fg --accent --on-accent --focus --btn-radius --font
  --font-display --display-weight`. Some themes also share others; the table is in THEME_SPEC.md §4.

Move the four somaari themes (warm-tactile, liquid-glass, dasara-jamboo, rajyotsava), the seasonal
schedule and the theme picker out of somaari-site and somaari-plan into somaari-common, so that each
part exists in exactly one place.

**Scope**
- In: somaari-common (new `theme/`), somaari-plan, somaari-site.
- Out: somaari-disk, somaari-ai, somaari-trip. Their UIs stay exactly as they are and nothing in
  those repos changes.
- Goal: no visible change in either app. The one intended exception is how somaari-site loads its
  fonts (decision D1 below).

---

## 1. What is duplicated today

| Part | somaari-site | somaari-plan | Same? |
|---|---|---|---|
| `THEMES` ids + `<meta theme-color>` colours | `theme.js` | `web/js/theme.js` | Yes |
| `SCHEDULE` + `getDefaultTheme` (IST) | `theme.js` | `web/js/theme.js` | Yes, kept matching by hand ("keep in step") |
| Preview (`?theme=`), saved choice (`localStorage somaari-theme`), picker popover wiring | `theme.js` | `web/js/theme.js` | Yes |
| Picker radios (Auto + 4 labels) | HTML copy in every page's SHARED HEADER | `web/index.html` | Yes |
| Schedule tests | `scripts/test-theme.mjs` | `tests/test_app.py::test_theme_schedule` | Same cases, two copies |
| Font loading | Google Fonts `<link>` per theme (`loadFonts`) | Self-hosted woff2 + `@font-face` in `app.css` | Same fonts, two mechanisms |
| Theme tokens | `style.css`: `--text`, `--border`, `--accent-contrast` … | `app.css`: `--fg`, `--line`, `--on-accent` … | Many values the same, under different names |
| Site-only: per-theme screenshots (`showShots`) | `theme.js` | none | Site only |
| Layout, decorations, picker popover styling | `style.css` | `app.css` | Different per app, stays per app |

---

## 2. Target layout in somaari-common

```
somaari-common/
├── theme/                         ← CANONICAL, language-neutral (plain JS/CSS/fonts)
│   ├── theme.js                   ← themes, schedule, preview/save, picker (generates radios), change event
│   ├── themes.css                 ← @font-face + one :root[data-theme=…] block of SHARED tokens per theme
│   ├── fonts/                     ← the woff2 files + OFL-*.txt (moved from somaari-plan/web/fonts)
│   └── files.json                 ← list of files an app must serve (used by the site build + tests)
├── python/
│   └── somaari_theme/             ← NEW small package: static_dir() → path of the bundled theme/
│       └── __init__.py              (theme/ pulled into the wheel by force-include, like about/*.json)
├── tests/
│   └── test_theme.py              ← schedule cases (merged from both apps), files.json is complete,
│                                    every SCHEDULE theme exists, every THEMES id has a css block
├── docs/
│   └── THEME_SPEC.md              ← the standard: markup contract, token list, how to integrate
└── .github/workflows/site-theme.yml  ← push to theme/ on main → call the site's deploy hook
```

The existing pattern stays the same: somaari-common is unversioned, apps always use `main`, there are
no submodules, and nothing is fetched at runtime. Neither app commits a copy of the shared files:
- **somaari-plan** already depends on `somaari-common` through pip/uv (`subdirectory=python`). The
  wheel ships `theme/` inside `somaari_theme` (via `force-include "../theme"`, the mechanism
  `somaari_about` already uses for its JSON), and Flask serves it at `/theme/…`.
- **somaari-site** downloads `theme/` from somaari-common `main` during `npm run build` into
  `dist/theme/`, the same way it already downloads app guides and screenshots. `--local` reads
  `../somaari-common`.

### 2.1 `theme/theme.js`: the single script
Based on today's two files (about 90% the same). Changes:
- `THEMES[id] = { color, label }`. Labels move here from the HTML. `fonts` is dropped because
  `@font-face` handles fonts now (D1).
- The radios are built from `THEMES` into the app's existing `#theme-picker fieldset`. The toggle
  button, legend and popover markup stay in each app.
- On every apply it fires `document.documentElement.dispatchEvent(new CustomEvent("somaari-theme", {detail: {id}}))`.
  This is the only extension point an app needs.
- The `module.exports` branch stays (Node tests and the site build read `THEMES`, `SCHEDULE`,
  `DEFAULT_THEME`, `getDefaultTheme`).
- Still a classic blocking script in `<head>`, so there is no flash of the wrong theme.

### 2.2 `theme/themes.css`: shared tokens only
- Canonical token names (somaari-plan's, which are the shorter ones): `color-scheme`, `--fg`,
  `--line`, `--accent`, `--on-accent`, `--focus`, `--font`, `--font-display`, `--display-weight`,
  `--btn-radius`, plus the named theme colours `--gold`, `--sand`, `--brick`, `--grain`, and
  `--page-bg` where both apps use the same value (warm-tactile, dasara-jamboo).
- **Rule:** a token goes into common only if both apps use the same value for it. A token whose
  value differs between the apps (for example liquid-glass `--line` and `--page-bg`, or `--card-bg`)
  stays in that app's CSS. Nothing in common is overridden by an app.
- Selectors are `:root, :root[data-theme=warm-tactile]` and `:root[data-theme=<id>]`, so the page
  keeps warm-tactile without JS.
- `@font-face` uses relative URLs (`url("fonts/Mukta-400.woff2")`), so it works wherever `/theme/`
  is served.
- The final token list is produced in step 1 by diffing the two CSS files value by value. It goes
  in THEME_SPEC.md.

---

## 3. Changes in somaari-plan

1. `pyproject.toml`: no new dependency (the package already comes from somaari-common). Run
   `uv lock --upgrade-package somaari-common`.
2. `app/__init__.py`: add a `/theme/<path>` route serving `somaari_theme.static_dir()`.
3. `web/index.html`: `<script src="/theme/theme.js">`, then `<link href="/theme/themes.css">` before
   `/css/app.css`. Remove the five hard-coded radios and keep the fieldset and legend.
4. `web/css/app.css`: remove the `@font-face` lines and every token now in `themes.css`. Keep the
   app-only tokens (`--bg`, `--panel*`, `--field`, `--track`, `--muted-fg`, `--drop-hover`, cells,
   radii …) in per-theme blocks, plus all decorations and the popover styling.
5. Delete `web/js/theme.js` and `web/fonts/`.
6. `tests/test_app.py`: replace `test_theme_schedule` (now in common) with a test that
   `/theme/theme.js`, `/theme/themes.css` and one font return 200.
7. Docs: UI_SPEC.md (Themes section points to somaari-common/docs/THEME_SPEC.md), ARCHITECTURE.md
   (new route, files removed), DECISIONS.md (new D-18 recording this move), CHANGELOG.md, STATUS.md.
8. Check the `site-demo` CI still records (it runs the app, so `/theme/` must be served there too).

## 4. Changes in somaari-site

1. `scripts/build-docs.mjs`: fetch the files in `theme/files.json` from somaari-common `main` (or
   `--local`) into `dist/theme/` before anything else. Read `THEMES`/`DEFAULT_THEME` from that
   fetched copy instead of `../theme.js`. Remove `theme.js` from `PUBLISH`.
2. Cache-busting: `asset-versions.mjs` drops `theme.js` from its list. The build adds
   `?v=<hash>` to `/theme/theme.js` and `/theme/themes.css` in the `dist/` HTML, because those files
   don't exist in the source tree.
3. Every page (`index.html`, `404.html`, `apps/*/index.html`): `<script src="/theme/theme.js">`,
   then `<link href="/theme/themes.css">` before `/style.css`. Remove the radios from the SHARED
   HEADER (`check-shared.mjs` keeps the copies matching).
4. `style.css`: rename `--text`→`--fg`, `--border`→`--line`, `--accent-contrast`→`--on-accent`
   throughout. Remove the tokens now in `themes.css`. Switch theme selectors to
   `:root[data-theme=…]`. Decorations (glows, dasara header/footer, cards) stay.
5. `showShots` (per-theme screenshots) moves to a new site-only `shots.js`. It runs on load and on
   the `somaari-theme` event, is loaded `defer` on detail pages, and is added to `PUBLISH` and
   `asset-versions.mjs`.
6. Delete `theme.js` and `scripts/test-theme.mjs`. `npm run check` drops `test-theme.mjs`.
7. `_headers` CSP (if D1 = self-host): `style-src 'self'`, `font-src 'self'`, and remove both Google
   origins.
8. README: file table, "only external requests" line, and how a theme change in somaari-common
   reaches the site.
9. Add the `SOMAARI_SITE_DEPLOY_HOOK` secret to somaari-common so `site-theme.yml` can rebuild the
   site. You do this in GitHub settings.

---

## 5. Order of work

1. **Baseline screenshots** (before touching anything): headless `chromium` at 1280×800 and 390×844
   for the site (`/`, `/apps/somaari-plan/`) and plan (Today, Calendar, Settings, picker open),
   each with `?theme=<id>` for all 4 themes. Save under the scratchpad.
2. **somaari-common:** create `theme/` from the two existing files, `somaari_theme`, tests,
   THEME_SPEC.md, the README section, CHANGELOG and workflow. Run pytest.
3. **somaari-plan:** make the section 3 changes using the local checkout of somaari-common (uv path
   override for development only, not committed). Run the full pytest suite.
4. **somaari-site:** make the section 4 changes, then run `npm run check` and
   `npm run build -- --local ~/code/ai-projects`.
5. **Compare:** retake the step 1 screenshots and pixel-diff them. They should be identical except for
   font rasterisation on the site (D1). Also check: no flash of the wrong theme, Auto/saved/preview
   order, Esc and click-outside close the picker, and the site works with JS off (warm-tactile, noscript shots).
6. **Commit order** (only when you say so): somaari-common first and pushed, because plan's uv lock
   and the site build both read `main`. Then plan, then site. Each is one branch/PR per repo.

---

## 6. Decisions needed before starting

- **D1. Site fonts: self-host from somaari-common (recommended) or keep Google Fonts?** Self-hosting
  is the only way to have one font setup, and it removes the site's only third-party request. The
  cost is that the site serves about 400 KB of fonts itself. A visitor downloads only the faces the
  current theme uses, as in plan today. Keeping Google Fonts means the site keeps its own
  `loadFonts` and font list, which is a second copy.
- **D2. The site build depends on somaari-common `main` at deploy time.** A push to `theme/`
  rebuilds the site through the deploy hook, and a broken theme push shows up on the next site
  build. The alternative is pinning a commit in `docs.config.json`, which goes against "common is
  not versioned". Recommended: use `main`, matching the app guides.
- **D3. Fallback font stacks differ slightly** (site: `Georgia, "Times New Roman", serif`; plan:
  `Georgia, serif`). Recommended: use the site's longer stack. It only matters if a woff2 fails to load.
