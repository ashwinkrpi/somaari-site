# somaari Themes — Specification

The four somaari themes, the seasonal schedule and the theme picker, shared by every themed somaari
app. Today those are somaari-site (somaari.in), somaari-plan, somaari-server, somaari-blog
(blog.somaari.in), somaari-docs (docs.somaari.in) and somaari-games (games.somaari.in); README
"How apps pick up changes" says how each gets the files. Other apps keep their own UI and don't
have to adopt this. The canonical files live in this repo:

- `theme/theme.js`: the theme list (id, `<meta theme-color>` colour, picker label), the seasonal
  schedule, the `?theme=` preview, the saved choice and the picker
- `theme/themes.css`: the `@font-face` rules and the tokens every themed app shares
- `theme/fonts/`: self-hosted woff2 fonts, `OFL-<Family>.txt` beside them
- `theme/files.json`: every file an app must serve under `/theme/`

somaari-common is **not versioned**. Apps always use the latest `main`. Apps never edit these files.
Most fetch them at build or install time; somaari-blog and somaari-server commit a copy made by their
sync scripts, which the next sync overwrites.

---

## 1. Themes

| id | Name | `color-scheme` | Fonts (body / display) |
|---|---|---|---|
| `rangoli` | Rangoli | light | Hanken Grotesk / Marcellus |
| `monsoon` | Monsoon | light | Hanken Grotesk / Literata |
| `graphite` | Graphite (default) | dark | Inter / Inter Tight |
| `liquid-glass` | Liquid Glass | dark | Onest / Onest |

All four have plain page backgrounds (no pattern); text sits on solid cards. (Apps may decorate a
theme, as somaari.in and somaari-plan add liquid-glass's glows.)
Graphite is cool neutral grey with a marigold-orange accent (`#f59e0b`).
Removed on 2026-11-17: `pi-console` (replaced by `graphite` as the default). Removed on 2026-11-13: `warm-tactile` (the old default), `dasara-jamboo` and `deepa` (their only dates
had passed), and `rajyotsava` (seasonal, 1–7 Nov; removed for now). A saved choice or `?theme=`
link naming a removed theme falls back to the schedule.

**Which theme shows:** `?theme=<id>` in the URL (a preview, never saved), else the saved choice
(`localStorage` key `somaari-theme`), else the schedule. "Auto (seasonal)" clears the saved choice.
localStorage is per origin, so on `somaari.in` and its subdomains the choice is also saved in a
`somaari-theme` cookie with `Domain=somaari.in` (value: a theme id, or `auto` for no saved choice).
The cookie wins over localStorage, so a choice made on docs.somaari.in also applies on somaari.in and
blog.somaari.in. Other hosts (an app on localhost or a Pi) use localStorage only.

**Schedule** (`SCHEDULE` in `theme.js`, judged by the calendar day in India, Asia/Kolkata):
empty for now, so every day gets the default, `graphite` (`DEFAULT_THEME`). The first matching entry wins. Remove a one-off entry
once its dates have passed.
To add a festival, add an entry there and a case to `tests/test_theme.py`.

## 2. How an app loads it

Serve `theme/` at `/theme/` and put this in `<head>`, in this order, before the app's own stylesheet:

```html
<meta name="theme-color" content="#FBC96B">
<script src="/theme/theme.js"></script>          <!-- blocking on purpose: no flash of the wrong theme -->
<link rel="stylesheet" href="/theme/themes.css">
<link rel="stylesheet" href="/your-app.css">
```

| App type | How it gets `/theme/` |
|---|---|
| **Python web app** | It already depends on `somaari-common` (`subdirectory=python`). Serve `somaari_theme.static_dir()` at `/theme/`; `somaari_theme.files()` lists the files. |
| **Static site with a build** | The build downloads `theme/files.json` and the files it lists from `main` (raw.githubusercontent.com) into `<out>/theme/`, and adds cache-busting versions to the two URLs. |

Without JS the page keeps rangoli (`:root` holds it; the default, graphite, needs `theme.js` to set `data-theme`) and the picker stays hidden. The fonts
still load, because they come from CSS.

## 3. The picker markup (per app)

Each app places and styles its own picker. `theme.js` finds it by these ids, adds the radios
(Auto plus one per theme, from `THEMES`) after the `<legend>`, un-hides it and wires it up:

```html
<div class="appearance" id="theme-picker" hidden>
  <button type="button" class="appearance-toggle" id="appearance-toggle" aria-expanded="false" aria-controls="appearance-menu">…</button>
  <div class="appearance-menu" id="appearance-menu" hidden>
    <fieldset>
      <legend>Theme</legend>
    </fieldset>
  </div>
</div>
```

Behaviour: the toggle opens the menu and focuses the checked radio. Esc closes it and returns focus
to the toggle; so does a click outside, or tabbing out of it. Choosing a theme applies and saves
it, and drops any `?theme=` from the URL.

**Event:** every time a theme is applied, `<html>` gets a `somaari-theme` event
(`event.detail.id`). Use it for anything CSS can't do. somaari-site uses it to swap its per-theme
screenshots.

## 4. Tokens

`themes.css` sets the **standard tokens** below on `:root[data-theme="<id>"]` (`:root` alone holds
rangoli). **Every theme sets every standard token**; `tests/test_theme.py` fails if one is missing.
That is what lets a theme be added, changed or removed here without changing any app.

| Token | What it is |
|---|---|
| `color-scheme` | `light` or `dark` |
| `--page-bg` | page background; a plain colour (no gradient or image) |
| `--card-bg` | cards, panels, menus |
| `--field-bg` | inputs and other fields |
| `--line` | borders and dividers |
| `--shadow`, `--shadow-hover` | card shadow at rest and on hover; always a valid shadow (`0 0 #0000` for none, never `none`), so it can be combined with others |
| `--fg` | text |
| `--muted` | secondary text (subtitles, intros) |
| `--subtle` | tertiary text (dates, meta, captions) |
| `--accent`, `--accent-hover` | links, buttons, highlights, and their hover |
| `--accent-text` | accent-coloured text on the page or a card, where `--accent` is too light or too dark for text |
| `--on-accent` | text on an `--accent` background |
| `--focus` | focus rings |
| `--status`, `--ok`, `--danger` | an "Available"-style highlight; success; errors |
| `--btn-radius`, `--radius`, `--field-radius`, `--card-radius` | buttons; small boxes and panels; fields; large cards |
| `--font`, `--font-display`, `--display-weight`, `--display-tracking` | body font, heading font, its weight and letter-spacing |

**How an app uses them:**

1. **Derive, once, for all themes.** The app's own tokens are set in one block that applies to every
   theme, from the standard ones: `:root, :root[data-theme] { --panel: var(--card-bg); --track:
   color-mix(in srgb, var(--line) 70%, var(--card-bg)); }`. With only this, a new theme looks right.
2. **Fine-tune, optionally, per theme.** An app may add `:root[data-theme="<id>"]` blocks after that,
   for values a formula can't give (a calendar shade, a decoration such as liquid-glass's glows). They
   are taste, never required: a theme without one still works, and a block for a removed theme is
   ignored. Use `:root:not([data-theme]), :root[data-theme="rangoli"]` for rangoli, so it also covers
   the look without JS. A fine-tune block may override a standard token (liquid-glass's gradient page
   in somaari-plan) because it loads after `themes.css`.
3. **Don't set a standard token in the derive block**, unless the app deliberately replaces it for
   every theme.

Scoped overrides (for example dark ink on a light card inside a dark theme) may set `--fg`, `--accent`
and so on on a descendant.

**Adding a standard token:** add it to every theme here and to `STANDARD_TOKENS` in the tests. Apps
keep working (they don't use it yet). Removing or renaming one breaks the apps that use it: mark it
**BREAKING** in the changelog and update those apps first.

## 5. Fonts

Self-hosted woff2 (Latin subsets; Onest also has
Google Fonts' math and symbols subsets for its arrows, ✓ and ↻). A browser downloads only the faces
the current theme uses, and only the subsets whose characters appear on the page. There are no
third-party font requests, so a strict CSP can use `font-src 'self'` and `style-src 'self'`.
The licences (`OFL-<Family>.txt`) must be served alongside the fonts.

## 6. Changing the themes

Every change is made here only; no app needs editing.

- **Change a theme:** edit its block in `themes.css` (or its entry in `THEMES`).
- **Add a theme:** add it to `THEMES` in `theme.js` and give it a block in `themes.css` that sets
  every standard token (section 4). New fonts go in `theme/fonts/` with their `OFL-<Family>.txt`, an
  `@font-face` here and entries in `theme/files.json`. Optional: somaari-plan's screenshot for it
  (`scripts/screenshots/take.sh` there reads the theme list from `theme.js`) and its path in
  `apps/apps.json`; until then somaari.in shows the default theme's screenshot for it.
- **Remove a theme:** take it out of `THEMES` and `themes.css`, and its fonts if nothing else uses
  them. Saved choices and links for it fall back to the schedule. Apps' fine-tune blocks for it are
  ignored (tidy them when convenient); somaari.in skips its `apps.json` screenshot with a warning.

Then:

1. Run the tests (see README). Check the themed apps in every theme with `?theme=<id>`, at desktop
   and 380 px phone width.
2. Push to `main`. `.github/workflows/site-theme.yml` runs the tests and rebuilds somaari.in, and
   docs.somaari.in redeploys at its next hourly refresh. The other apps pick up the change as the
   README table "How apps pick up changes" says (for somaari-plan,
   `uv lock --upgrade-package somaari-common`; for somaari-server, `scripts/sync-common.sh` and a
   release; for somaari-blog, `npm run sync:common`). Those are only syncs: no CSS changes.
