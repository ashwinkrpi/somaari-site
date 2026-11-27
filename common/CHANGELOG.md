# Changelog

somaari-common is not versioned. Entries are dated; changes that break apps are marked **BREAKING**.

## 2026-11-17 (standard tokens)

- Themes: every theme now sets the same **standard tokens** (`docs/THEME_SPEC.md` section 4): `--page-bg`, `--card-bg`, `--field-bg`, `--line`, `--shadow`, `--shadow-hover`, `--fg`, `--muted`, `--subtle`, `--accent`, `--accent-hover`, `--accent-text`, `--on-accent`, `--focus`, `--status`, `--ok`, `--danger`, the four radii, the fonts, `--display-weight` and `--display-tracking`. liquid-glass now sets `--page-bg`, `--card-bg`, `--line` and `--shadow` too. Values are the ones the apps already used, so nothing looks different. `tests/test_theme.py` fails if a theme misses one. Apps derive their own tokens from these once for every theme, so a theme added, changed or removed here needs no app CSS change; per-theme app blocks are now optional fine-tuning.
- Themes: graphite's `--shadow` is `0 0 #0000` instead of `none` (looks the same), so a shadow token can always be combined with others.

## 2026-11-17

- **BREAKING** Themes: removed `pi-console`. New theme `graphite` (dark: cool neutral grey `#111214`, cards `#18191c`, marigold-orange accent `#f59e0b`; Inter / Inter Tight 700) is the new default (`DEFAULT_THEME`). It sets `--page-bg`, `--card-bg`, `--line` and `--shadow` here, like rangoli and monsoon. Fonts: added Inter and Inter Tight (Latin, OFL); removed IBM Plex Sans and JetBrains Mono (only pi-console used them). `:root` still holds rangoli for pages without JS. Apps must replace their `pi-console` blocks with `graphite` ones, and somaari-plan needs `docs/screenshots/theme-graphite.png` (now named in `apps.json`) before somaari.in rebuilds. Saved choices and `?theme=pi-console` links fall back to the default, graphite.

## 2026-11-15

- Themes: `pi-console` is now the default (`DEFAULT_THEME`), and its accent is tangerine orange instead of green. `:root` still holds rangoli, so pages without JS keep the rangoli look.

## 2026-11-13

- **BREAKING** Themes: removed `rajyotsava` (for now), its schedule entry and its fonts (Mukta, Baloo Tamma 2). `SCHEDULE` is empty, so every day gets `rangoli`. Apps must drop their `rajyotsava` blocks and screenshots. Saved choices and `?theme=rajyotsava` links fall back to `rangoli`.
- Themes: on `somaari.in` and its subdomains `theme.js` also saves the choice in a `somaari-theme` cookie with `Domain=somaari.in` (a theme id, or `auto`), and reads it before localStorage, so one choice carries across somaari.in, docs and the blog. Other hosts are unchanged.
- **BREAKING** Themes: removed `warm-tactile`, `dasara-jamboo` and `deepa` (the last two had only 2026 dates, now past). New themes `rangoli` (the new default and `:root` fallback; marigold, indigo and vermilion; Hanken Grotesk / Marcellus), `monsoon` (cool grey-blue and teal; Hanken Grotesk / Literata) and `pi-console` (dark, terminal green; IBM Plex Sans / JetBrains Mono), all with plain page backgrounds. They set `--page-bg`, `--card-bg`, `--line` and `--shadow` here, so apps must not redefine those for them. Fonts: added Marcellus, Literata, IBM Plex Sans and JetBrains Mono (Latin, OFL); removed Fraunces and Rozha One. `SCHEDULE` now holds only the yearly Rajyotsava entry. Apps must drop their blocks for the removed themes, add blocks for the new ones, and replace per-theme screenshots (somaari-site, somaari-plan). Saved choices and `?theme=` links for removed themes fall back to the schedule.

## 2026-11-07

- Themes: new `deepa` theme (Deepavali – Deepa: indigo night, warm lamplight; Hanken Grotesk / Fraunces), scheduled for 7–10 Nov 2026. It is listed before `rajyotsava` in `SCHEDULE`, so it takes over rajyotsava's last day (7 Nov). Apps need their own `deepa` block for their app tokens; somaari-site's build also needs a `deepa` screenshot for somaari-plan's detail page.

## 2026-10-19

- Themes: `theme/` (theme.js, themes.css, self-hosted fonts, files.json), moved here from somaari-site and somaari-plan so there is one copy. `theme.js` now builds the picker's radios from `THEMES` and fires a `somaari-theme` event; `themes.css` holds only the tokens both apps share. Onest gains Google Fonts' math and symbols subsets (arrows, ✓, ↻). Python adapter `somaari_theme` serves it; `docs/THEME_SPEC.md` is the standard; `site-theme.yml` rebuilds somaari.in on a theme push.

## 2026-10-16

- Developer name is now "Ashwin Koppam Raghavendra" (was "Ashwin").
- Initial About section content: `developer.json` + schema, `debug-fields.json`, Python adapter `somaari_about`, sync scripts, and `docs/ABOUT_SPEC.md`.
