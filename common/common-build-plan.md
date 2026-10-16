# somaari About Section — Build Plan & Claude Code Prompts

Paste these prompts into Claude Code in the folder each one names. See `instructions.md` for the reasoning and the order.

Replace placeholders before running:
- `<CONTACT_EMAIL>`: your public contact email

somaari-common is not versioned. Apps always use the latest `main`; only each app has its own version.

---

## Prompt 1 — Create the `somaari-common` repo

**Run in:** `~/code/ai-projects` (parent folder). **Run once.**

```text
Create a new git repo `somaari-common` in this folder. It is the single source of truth for the
About section shared by all somaari apps (somaari-ai, somaari-disk, somaari-plan, and future apps).
Future apps may NOT be Python, so the canonical content must be language-neutral (JSON + Markdown),
with Python as the first adapter only.

somaari-common itself is NOT versioned: no tags, no release numbers, no version field in the JSON,
no version reported by apps. Apps always consume the latest `main`. Only each app has its own version.

Structure:
somaari-common/
  about/developer.json         canonical developer info
  about/developer.schema.json  JSON Schema (draft 2020-12) validating developer.json
  about/debug-fields.json      canonical, ordered list of debug fields every app must report
  python/pyproject.toml        builds package `somaari_about`; installable via
                               pip "git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python"
  python/somaari_about/__init__.py
  python/somaari_about/collect.py
  scripts/sync-about.sh        vendors about/*.json from main into another repo
  tests/                       pytest
  docs/ABOUT_SPEC.md           the standard every app must follow
  README.md, CHANGELOG.md (dated entries, no version numbers), LICENSE (MIT), .gitignore

developer.json content:
- name: "Ashwin Koppam Raghavendra"
- brand: "somaari"
- website: "https://somaari.in"
- github: "https://github.com/ashwinkrpi"
- email: "<CONTACT_EMAIL>"
- license_note: short line about each app having its own license in its repo
- bug_report: "Open an issue on the app's GitHub repo and paste the copied debug info."

debug-fields.json: an ordered array of objects {key, label, description, required}. Include:
app_name, app_version, build_commit, build_date, os_name, os_version, kernel, architecture,
device_model (e.g. Raspberry Pi model from /proc/device-tree/model; "unknown" if absent),
runtime_name (e.g. "Python", "Node.js"), runtime_version, key_dependencies (name=version list),
data_dir, config_dir, log_dir, ai_provider, ai_model (both optional; never secrets),
locale, timezone.
Keys are snake_case and language-neutral. They are the contract for every language.

Python package:
- developer.json and debug-fields.json must be included as package data WITHOUT duplicating
  the source files. Use the build backend's force-include (e.g. hatchling) to pull them from ../about.
- pyproject.toml needs a version only because pip requires one: set a fixed `0.0.0` and never bump
  it. Do not expose __version__ or any somaari-common version to apps.
- collect.py exposes:
    load_developer() -> dict
    load_debug_fields() -> list[dict]
    collect(app_name, app_version, *, build_commit=None, build_date=None,
            packages=(), data_dir=None, config_dir=None, log_dir=None,
            ai_provider=None, ai_model=None) -> dict   # keys exactly = debug-fields keys
    as_text(info: dict, developer: dict) -> str        # plain-text block for clipboard
- Use only the standard library (importlib.metadata, platform, sys, locale, time). No network.
- Every field degrades to "unknown" / "dev" instead of raising. Must work on Linux (Pi 5 / ARM64),
  macOS and Windows.
- Redaction helper: any value that looks like a key/token (sk-..., long hex/base64, URLs with
  user:pass@) is replaced by "[redacted]". Apply it in collect() and as_text().

scripts/sync-about.sh <target_dir>:
- Uses `git -C <path-to-somaari-common> show main:about/<file>` to write developer.json and
  debug-fields.json into <target_dir>. No version marker file.
- Fails loudly if somaari-common has uncommitted changes under about/. POSIX sh, no extra dependencies.
- Also provide scripts/sync-about.ps1 with the same behaviour for Windows.

Tests:
- developer.json validates against the schema.
- debug-fields.json keys are unique snake_case.
- collect() returns exactly the debug-fields keys, never raises with all args omitted.
- Redaction catches sample secrets.

docs/ABOUT_SPEC.md must define, language-neutrally:
1. Where About must be reachable (GUI menu/dialog; terminal apps: `--about` flag and/or `about` command).
2. Sections shown: App (name, version, build), Developer (from developer.json), Debug info.
3. A "Copy debug info" action producing the plain-text block (format specified exactly, so all
   apps' output looks the same).
4. Rules: no secrets, no network calls, single version source per app, build info stamped at build
   time with "dev"/"unknown" fallback, never crash, developer info never retyped in an app.
5. How to integrate:
   (a) Python apps: pip git dependency on main + somaari_about.collect.
   (b) Non-Python apps: vendor via sync-about.sh into vendor/somaari-about/, then write a native
       collector that outputs exactly the keys in debug-fields.json and the same text format.
6. Change policy: somaari-common is unversioned. Prefer additive changes to debug-fields.json.
   Any rename/removal must be marked BREAKING in CHANGELOG.md, and every app must be refreshed.
7. The line every app's CLAUDE.md must contain.

README: short, links to ABOUT_SPEC.md, shows both integration paths.
CHANGELOG: one dated entry, "Initial About section content".

When done: run the tests, show me developer.json and ABOUT_SPEC.md for review, make the initial
commit. Do NOT create the GitHub remote. I will do that after reviewing.
```

**After Prompt 1:** review, then create the public GitHub repo `ashwinkrpi/somaari-common` and push `main`.

---

## Prompt 2 — Integrate About into an existing app (general)

**Run in:** the app's own folder (e.g. `~/code/ai-projects/somaari-disk`). **Run once per app, in a separate session for each.** Append that app's notes from the next section to the end of the prompt.

```text
Add a standard About section to this app, following
../somaari-common/docs/ABOUT_SPEC.md (read it first; it is the contract). somaari-common is not
versioned; use its latest main and do not report or store any somaari-common version.

1. Detect this app's language/stack and tell me what you found before changing anything.
2. Integration path:
   - If Python: add the dependency
       somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python
     to the existing dependency file (pyproject/requirements), and use somaari_about.collect.
   - If not Python: run ../somaari-common/scripts/sync-about.sh vendor/somaari-about,
     commit the vendored files, and write a small native collector that outputs exactly the keys
     in vendor/somaari-about/debug-fields.json and the text format from ABOUT_SPEC.md.
3. Version: find the app's single existing version source (pyproject, __version__, package.json, etc.).
   If there are several, consolidate to one and tell me. Never hard-code the version in the About code.
4. Build info: stamp git commit and build date at build/release time (e.g. generated _build_info file
   that is git-ignored, or an env var in the build script). Fall back to "dev"/"unknown" when
   running from source.
5. Pass the app's real data/config/log dirs and the configured AI provider/model (names only, never keys).
   List the app's key dependencies for the key_dependencies field.
6. Build the About UI in this app's existing style (see app-specific notes below), with a
   "Copy debug info" action.
7. Add a test that the About data includes every debug-fields key and contains no secrets.
8. Add this line to CLAUDE.md (keep CLAUDE.md lean, one line only):
   About section: follow somaari-common/docs/ABOUT_SPEC.md.
9. Run the tests, then show me the copied debug-info text from a real run so I can check it.
   Commit with message "Add standard About section".

App-specific notes:
```

### App-specific notes to append

**somaari-disk** (Python + pywebview + HTML/CSS/JS):
```text
- About opens from the app's menu/header as a modal in the existing HTML/CSS/JS UI, matching the
  current visual design. Expose the About data to the UI through the existing pywebview JS API bridge.
- "Copy debug info" uses the pywebview clipboard path or the JS Clipboard API, whichever works on
  both Linux (Twister OS, Pi 5) and Windows.
- Must stay platform-independent (Windows support is planned). No Unix-only calls in the About code.
- Keep to the spec fields only; do not add app-specific fields without asking me.
```

**somaari-ai** (smart terminal app):
```text
- Terminal app: add a `--about` CLI flag and an in-app `about` command. Both print the About block.
- Add `--about --copy` (or an in-app `about copy`) that copies debug info to the clipboard if a
  clipboard tool is available (wl-copy/xclip/pbcopy/clip.exe); otherwise print it with a note.
- ai_provider/ai_model: report the configured primary and fallback provider/model names
  (e.g. OpenRouter primary, Anthropic fallback). NEVER print API keys or full endpoint URLs with keys.
- Output must fit an 80-column terminal.
```

**somaari-plan** (planner with left-side menu):
```text
- Add "About" as the last item in the left-side menu panel (after Today, Calendar, Dashboard,
  New plan). Like the other items, it shows only its own view.
- Match the Kinetic Swiss Editorial style in both light and dark themes.
- ai_provider/ai_model: report the configured primary (Jev) and fallback (openrouter_free) names,
  never keys.
- Log any decision that needs me into the manual-decisions md file instead of guessing.
```

---

## Prompt 3 — Consistency audit across all apps

**Run in:** `~/code/ai-projects` (parent). **Read-only.** Run after integrating, and after every somaari-common update.

```text
Read-only audit, do not modify files. For every folder here that is a somaari app (somaari-* except
somaari-common), report in one table:
- app, language, integration path (pip git dependency or vendored JSON),
- for vendored apps: whether vendor/somaari-about/*.json matches somaari-common main,
- whether every key in somaari-common/about/debug-fields.json (current main) is reported,
- whether developer info is read from somaari-common (flag any retyped name/email/website),
- whether CLAUDE.md contains the ABOUT_SPEC.md line,
- whether any secret could leak into debug info.
Then list which apps need a refresh (Prompt 4). Keep the output short.
```

---

## Prompt 4 — Refresh an app after a somaari-common change

**Run in:** the app's folder, after you've pushed a change to somaari-common `main`.

```text
Refresh this app's About section to the latest somaari-common main.
1. Read ../somaari-common/CHANGELOG.md for entries since this app's last About commit, and summarise them.
2. Update the shared data: for Python apps, reinstall the dependency
   (pip install --force-reinstall --no-deps "somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python");
   for non-Python apps, re-run ../somaari-common/scripts/sync-about.sh vendor/somaari-about.
3. If new debug fields were added, implement them (native collector for non-Python apps).
   If any change is marked BREAKING, list it and stop for my confirmation before editing.
4. Run the tests, show the new copied debug-info text, and commit with
   "Refresh About section from somaari-common".
```

---

## Prompt 5 — New future app (any language)

**Run in:** the new app's folder, once the app has a basic structure.

```text
This is a new somaari app. Add the standard About section per ../somaari-common/docs/ABOUT_SPEC.md,
using the latest somaari-common main (somaari-common is not versioned).
Follow the same steps as an existing-app integration:
detect language → Python: pip git dependency; otherwise: sync-about.sh into vendor/somaari-about
plus a native collector matching debug-fields.json and the spec's text format → single version source →
build-info stamping with dev/unknown fallback → About UI in this app's style with "Copy debug info" →
test for all fields and no secrets → add the ABOUT_SPEC.md line to CLAUDE.md → commit.
If this app's language would benefit from a reusable adapter (e.g. a second JS/TS app), tell me;
we can add an adapter folder to somaari-common instead of repeating the collector.
```

---

## Updating developer info (somaari-common itself)

**Run in:** `~/code/ai-projects/somaari-common`.

```text
Update about/developer.json: <describe change>. Validate against the schema, run tests,
add a dated CHANGELOG entry (mark it BREAKING if it renames or removes anything), and commit.
```

Then: push, run Prompt 4 in each app, and finish with Prompt 3.
