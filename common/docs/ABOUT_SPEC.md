# somaari About Section — Specification

The standard every somaari app follows, whatever its language. The shared data lives in this repo:

- `about/developer.json`: developer info (validated by `about/developer.schema.json`)
- `about/debug-fields.json`: the ordered list of debug fields every app reports

somaari-common is **not versioned**. Apps always use the latest `main`. Only each app has its own version.

---

## 1. Where About is reachable

- **GUI apps:** an "About" item in the main menu, header or navigation, opening a dialog or view.
- **Terminal apps:** a `--about` flag and/or an in-app `about` command. Both print the About block.

## 2. What About shows

1. **App:** name, version, build (`build_commit`, `build_date`).
2. **Developer:** every field of `developer.json` (name, brand, website, GitHub, email, license note, bug-report text). Links are clickable where the UI allows.
3. **Debug info:** every field in `debug-fields.json`, in file order, using its `label`.

## 3. "Copy debug info"

Every app has a **Copy debug info** action (button, `about copy` command, or `--about --copy`). It copies this plain-text block exactly. Terminal apps with no clipboard tool print the block with a note.

```
[somaari debug info]
<key>: <value>          one line per debug field, in debug-fields.json order
...
[developer]
name: <developer.name>
website: <developer.website>
email: <developer.email>
```

Rules for the block:

- Keys are the raw `key` values (not labels), followed by `: ` and the value.
- One line per field, `\n` line endings, ending with a trailing newline. ASCII header lines exactly as shown.
- List values (e.g. `key_dependencies`) are joined with `, `. An empty list is `none`.
- Every key is always present. Missing values use the fallbacks in section 4.
- Values are redacted (section 4) before output.

Example:

```
[somaari debug info]
app_name: somaari-disk
app_version: 1.4.0
build_commit: a1b2c3d
build_date: 2026-10-16
os_name: Linux
os_version: Debian GNU/Linux 12 (bookworm)
kernel: 6.12.96+rpt-rpi-v8
architecture: aarch64
device_model: Raspberry Pi 5 Model B Rev 1.1
runtime_name: Python
runtime_version: 3.11.2
key_dependencies: pywebview=5.3, requests=2.32.3
data_dir: /home/ashwin/.local/share/somaari-disk
config_dir: /home/ashwin/.config/somaari-disk
log_dir: n/a
ai_provider: n/a
ai_model: n/a
locale: en_US.UTF-8
timezone: IST (UTC+05:30)
[developer]
name: Ashwin Koppam Raghavendra
website: https://somaari.in
email: hello@somaari.in
```

## 4. Rules

- **No secrets.** Never show or copy API keys, tokens, passwords, or URLs with credentials. Report AI provider and model *names* only. Every value goes through a redaction step: any value that looks like a key/token (`sk-…`, `ghp_…`, `Bearer …`, `api_key=…`, long hex/base64 strings, `user:pass@` URLs) is replaced by `[redacted]`.
- **No network calls** to build About or debug info.
- **Single version source.** The app version comes from one place in the app (pyproject, `__version__`, package.json…). It is never hard-coded in the About code.
- **Build info is stamped at build/release time** (generated, git-ignored build-info file or build-script env var). `build_commit` is a short hash (max 12 chars). Fallbacks when running from source: `build_commit` = `dev`, `build_date` = `unknown`.
- **Never crash.** Any field that can't be determined is `unknown`. Optional fields (`"required": false`) that don't apply are `n/a`.
- **Developer info is never retyped in an app.** It is always read from somaari-common (pip package or vendored JSON).
- **No somaari-common version** is stored, pinned or shown by apps.

## 5. How to integrate

### (a) Python apps

Add the dependency (tracks `main`):

```
somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python
```

Then:

```python
from somaari_about import collect, as_text, load_developer

info = collect(
    "somaari-disk", __version__,
    build_commit=BUILD_COMMIT, build_date=BUILD_DATE,   # None when running from source
    packages=("pywebview", "requests"),
    data_dir=DATA_DIR, config_dir=CONFIG_DIR, log_dir=LOG_DIR,
    ai_provider=None, ai_model=None,
)
developer = load_developer()
clipboard_text = as_text(info, developer)
```

To pick up later changes: `pip install --force-reinstall --no-deps "somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python"`.

### (b) Non-Python apps

1. Vendor the shared JSON from `main`:
   - Linux/macOS: `../somaari-common/scripts/sync-about.sh vendor/somaari-about`
   - Windows: `../somaari-common/scripts/sync-about.ps1 vendor/somaari-about`
2. Commit `vendor/somaari-about/developer.json` and `debug-fields.json`.
3. Write a small native collector that outputs **exactly** the keys in `vendor/somaari-about/debug-fields.json`, with the fallbacks and redaction from section 4, and the text format from section 3.

Re-run the sync script to pick up later changes.

## 6. Change policy

somaari-common is unversioned, so `main` is always the current contract.

- Prefer **additive** changes to `debug-fields.json`. A new field means every app must report it on its next refresh.
- Any rename, removal or other breaking change is marked **BREAKING** in `CHANGELOG.md`, and every app must be refreshed.
- Every change gets a dated `CHANGELOG.md` entry.

## 7. CLAUDE.md line

Every somaari app's `CLAUDE.md` contains this line:

```
About section: follow somaari-common/docs/ABOUT_SPEC.md.
```
