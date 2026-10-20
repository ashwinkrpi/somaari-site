# somaari Themes — Specification

The four somaari themes, the seasonal schedule and the theme picker, shared by every themed somaari
app. Today that is somaari-site (somaari.in) and somaari-plan. Other apps keep their own UI and don't
have to adopt this. The canonical files live in this repo:

- `theme/theme.js`: the theme list (id, `<meta theme-color>` colour, picker label), the seasonal
  schedule, the `?theme=` preview, the saved choice and the picker
- `theme/themes.css`: the `@font-face` rules and the tokens every themed app shares
- `theme/fonts/`: self-hosted woff2 fonts, `OFL-<Family>.txt` beside them
- `theme/files.json`: every file an app must serve under `/theme/`

somaari-common is **not versioned**. Apps always use the latest `main`. Apps never commit a copy of
these files.

---

## 1. Themes

| id | Name | `color-scheme` | Fonts (body / display) |
|---|---|---|---|
| `warm-tactile` | Warm Tactile (default) | light | Hanken Grotesk / Fraunces |
| `liquid-glass` | Liquid Glass | dark | Onest / Onest |
| `dasara-jamboo` | Dasara – Jamboo Savari | dark | Mukta / Rozha One |
| `rajyotsava` | Kannada Rajyotsava | light | Mukta / Baloo Tamma 2 |

**Which theme shows:** `?theme=<id>` in the URL (a preview, never saved), else the saved choice
(`localStorage` key `somaari-theme`), else the schedule. "Auto (seasonal)" clears the saved choice.
Because the key is shared, a choice made on one app is remembered by the others only on the same
origin.

**Schedule** (`SCHEDULE` in `theme.js`, judged by the calendar day in India, Asia/Kolkata):
17–20 Oct 2026 `dasara-jamboo`; 1–7 Nov every year `rajyotsava`; otherwise `warm-tactile`.
To add a festival, add an entry there and a case to `tests/test_theme.py`.

## 2. How an app loads it

Serve `theme/` at `/theme/` and put this in `<head>`, in this order, before the app's own stylesheet:

```html
<meta name="theme-color" content="#EDE3D3">
<script src="/theme/theme.js"></script>          <!-- blocking on purpose: no flash of the wrong theme -->
<link rel="stylesheet" href="/theme/themes.css">
<link rel="stylesheet" href="/your-app.css">
```

| App type | How it gets `/theme/` |
|---|---|
| **Python web app** | It already depends on `somaari-common` (`subdirectory=python`). Serve `somaari_theme.static_dir()` at `/theme/`; `somaari_theme.files()` lists the files. |
| **Static site with a build** | The build downloads `theme/files.json` and the files it lists from `main` (raw.githubusercontent.com) into `<out>/theme/`, and adds cache-busting versions to the two URLs. |

Without JS the page keeps warm-tactile (`:root` holds it) and the picker stays hidden. The fonts
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

`themes.css` sets these custom properties on `:root[data-theme=<id>]` (`:root` alone holds
warm-tactile). An app uses them and **never redefines them**. Everything else (layout, panels,
cards, cells, decorations, the picker's look) is the app's, in its own per-theme blocks.

| Token | warm-tactile | liquid-glass | dasara-jamboo | rajyotsava |
|---|---|---|---|---|
| `color-scheme` | ✓ | ✓ | ✓ | ✓ |
| `--fg` (text) | ✓ | ✓ | ✓ | ✓ |
| `--accent`, `--on-accent` (text on accent), `--focus` | ✓ | ✓ | ✓ | ✓ |
| `--btn-radius` | ✓ | ✓ | ✓ | ✓ |
| `--font`, `--font-display`, `--display-weight` | ✓ | ✓ | ✓ | ✓ |
| `--page-bg` | ✓ | app | ✓ | app |
| `--line` | ✓ | app | app | app |
| `--card-bg` | app | app | ✓ | app |
| `--shadow` | app | app | app | ✓ |
| Named colours | | | `--gold` | `--grain`, `--sand`, `--brick` |

"app" means the token isn't shared for that theme: the apps use different values, so each app sets
it in its own block. **Rule:** a token moves into `themes.css` only when every themed app uses the
same value for it. If an app needs a different value, it stays in the app's own CSS.

Selectors: `themes.css` uses `:root[data-theme="<id>"]`. An app's per-theme blocks may use
`html[data-theme="<id>"]` or `:root[data-theme=<id>]`. They don't conflict, because no token is set
in both places. Scoped overrides (for example dark ink on dasara's cream cards) may set `--fg`,
`--accent` and so on on a descendant. That is a local override, not a redefinition.

## 5. Fonts

Self-hosted woff2 (Latin subsets; Baloo Tamma 2 also has a Kannada subset for "ಕ"; Onest also has
Google Fonts' math and symbols subsets for its arrows, ✓ and ↻). A browser downloads only the faces
the current theme uses, and only the subsets whose characters appear on the page. There are no
third-party font requests, so a strict CSP can use `font-src 'self'` and `style-src 'self'`.
The licences (`OFL-<Family>.txt`) must be served alongside the fonts.

## 6. Changing the themes

1. Edit `theme/` (and `tests/test_theme.py`). Add any new file to `theme/files.json`.
2. Run the tests (see README). Check both apps in every theme with `?theme=<id>`, at desktop and
   380 px phone width.
3. Push to `main`. `.github/workflows/site-theme.yml` runs the tests and rebuilds somaari.in.
   somaari-plan picks up the change with `uv lock --upgrade-package somaari-common`.
