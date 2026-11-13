# Changelog

somaari-common is not versioned. Entries are dated; changes that break apps are marked **BREAKING**.

## 2026-11-13

- **BREAKING** Themes: removed `warm-tactile`, `dasara-jamboo` and `deepa` (the last two had only 2026 dates, now past). New themes `rangoli` (the new default and `:root` fallback; marigold, indigo and vermilion; Hanken Grotesk / Marcellus), `monsoon` (cool grey-blue and teal; Hanken Grotesk / Literata) and `pi-console` (dark, terminal green; IBM Plex Sans / JetBrains Mono), all with plain page backgrounds. They set `--page-bg`, `--card-bg`, `--line` and `--shadow` here, so apps must not redefine those for them. Fonts: added Marcellus, Literata, IBM Plex Sans and JetBrains Mono (Latin, OFL); removed Fraunces and Rozha One. `SCHEDULE` now holds only the yearly Rajyotsava entry. Apps must drop their blocks for the removed themes, add blocks for the new ones, and replace per-theme screenshots (somaari-site, somaari-plan). Saved choices and `?theme=` links for removed themes fall back to the schedule.

## 2026-11-07

- Themes: new `deepa` theme (Deepavali – Deepa: indigo night, warm lamplight; Hanken Grotesk / Fraunces), scheduled for 7–10 Nov 2026. It is listed before `rajyotsava` in `SCHEDULE`, so it takes over rajyotsava's last day (7 Nov). Apps need their own `deepa` block for their app tokens; somaari-site's build also needs a `deepa` screenshot for somaari-plan's detail page.

## 2026-10-19

- Themes: `theme/` (theme.js, themes.css, self-hosted fonts, files.json), moved here from somaari-site and somaari-plan so there is one copy. `theme.js` now builds the picker's radios from `THEMES` and fires a `somaari-theme` event; `themes.css` holds only the tokens both apps share. Onest gains Google Fonts' math and symbols subsets (arrows, ✓, ↻). Python adapter `somaari_theme` serves it; `docs/THEME_SPEC.md` is the standard; `site-theme.yml` rebuilds somaari.in on a theme push.

## 2026-10-16

- Developer name is now "Ashwin Koppam Raghavendra" (was "Ashwin").
- Initial About section content: `developer.json` + schema, `debug-fields.json`, Python adapter `somaari_about`, sync scripts, and `docs/ABOUT_SPEC.md`.
