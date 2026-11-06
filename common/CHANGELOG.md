# Changelog

somaari-common is not versioned. Entries are dated; changes that break apps are marked **BREAKING**.

## 2026-11-07

- Themes: new `deepa` theme (Deepavali – Deepa: indigo night, warm lamplight; Hanken Grotesk / Fraunces), scheduled for 7–10 Nov 2026. It is listed before `rajyotsava` in `SCHEDULE`, so it takes over rajyotsava's last day (7 Nov). Apps need their own `deepa` block for their app tokens; somaari-site's build also needs a `deepa` screenshot for somaari-plan's detail page.

## 2026-10-19

- Themes: `theme/` (theme.js, themes.css, self-hosted fonts, files.json), moved here from somaari-site and somaari-plan so there is one copy. `theme.js` now builds the picker's radios from `THEMES` and fires a `somaari-theme` event; `themes.css` holds only the tokens both apps share. Onest gains Google Fonts' math and symbols subsets (arrows, ✓, ↻). Python adapter `somaari_theme` serves it; `docs/THEME_SPEC.md` is the standard; `site-theme.yml` rebuilds somaari.in on a theme push.

## 2026-10-16

- Developer name is now "Ashwin Koppam Raghavendra" (was "Ashwin").
- Initial About section content: `developer.json` + schema, `debug-fields.json`, Python adapter `somaari_about`, sync scripts, and `docs/ABOUT_SPEC.md`.
