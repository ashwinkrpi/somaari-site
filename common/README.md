# somaari-common

Single source of truth for what somaari apps share:

- the **About** section, used by all somaari apps (somaari-ai, somaari-disk, somaari-plan, and future apps). The standard is [docs/ABOUT_SPEC.md](docs/ABOUT_SPEC.md).
- the **themes** (four themes, the seasonal schedule, the theme picker and fonts), used by the themed web apps: somaari-site and somaari-plan. The standard is [docs/THEME_SPEC.md](docs/THEME_SPEC.md).

somaari-common is not versioned: apps always use the latest `main`.

## Contents

- `about/developer.json`: developer info (schema: `about/developer.schema.json`)
- `about/debug-fields.json`: debug fields every app must report
- `python/`: `somaari_about`, the Python adapter
- `scripts/sync-about.sh` / `sync-about.ps1`: vendor the JSON into non-Python apps
- `theme/`: `theme.js`, `themes.css`, `fonts/` and `files.json` (the files an app serves at `/theme/`)
- `python/somaari_theme`: serves `theme/` from Python web apps (`static_dir()`, `files()`)

## Integrating

**Python apps:**

```
somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python
```

```python
from somaari_about import collect, as_text, load_developer
text = as_text(collect("my-app", __version__), load_developer())
```

**Other languages:**

```sh
../somaari-common/scripts/sync-about.sh vendor/somaari-about
```

Then write a native collector that outputs exactly the keys in `debug-fields.json`, in the text format from the spec.

## Themes

Serve `theme/` at `/theme/` and load `/theme/theme.js` and `/theme/themes.css` before the app's own stylesheet. A Python web app serves `somaari_theme.static_dir()`; a static site downloads the files in `theme/files.json` at build time. Markup, tokens and the rules for changing them: [docs/THEME_SPEC.md](docs/THEME_SPEC.md).

A push that changes `theme/` on `main` runs the tests and rebuilds somaari.in (`.github/workflows/site-theme.yml`, repo secret `SOMAARI_SITE_DEPLOY_HOOK`).

## Development

```sh
python3 -m venv .venv
.venv/bin/pip install pytest jsonschema ./python
.venv/bin/python -m pytest
```

Reinstall `./python` after editing `about/*.json`, `theme/` or the package. Tests check the installed copy against the source. The theme tests need `node`.

## Contributing

This is a personal project and doesn't accept pull requests; only collaborators can open them.
You're welcome to fork it and adapt it for yourself, and bug reports in
[Issues](https://github.com/ashwinkrpi/somaari-common/issues) are appreciated.
