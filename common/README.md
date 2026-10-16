# somaari-common

Single source of truth for the **About** section shared by all somaari apps (somaari-ai, somaari-disk, somaari-plan, and future apps).

The standard is [docs/ABOUT_SPEC.md](docs/ABOUT_SPEC.md). somaari-common is not versioned: apps always use the latest `main`.

## Contents

- `about/developer.json`: developer info (schema: `about/developer.schema.json`)
- `about/debug-fields.json`: debug fields every app must report
- `python/`: `somaari_about`, the Python adapter
- `scripts/sync-about.sh` / `sync-about.ps1`: vendor the JSON into non-Python apps

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

## Development

```sh
python3 -m venv .venv
.venv/bin/pip install pytest jsonschema ./python
.venv/bin/python -m pytest
```

Reinstall `./python` after editing `about/*.json` or the package. Tests check the installed copy against the source.
