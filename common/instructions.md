# somaari About Section — Step-by-Step Instructions

A shared, consistent **About** section for every somaari app: somaari-ai, somaari-disk, somaari-plan, and any future app, including apps not written in Python.

The prompts to paste into Claude Code are in `common-build-plan.md`. This file explains the approach and the order to do things in.

---

## 1. The core idea

**Share the data. Keep each app's UI separate.**

| Shared (one place, same for every app) | Per app (lives in each app's repo) |
|---|---|
| Developer name, GitHub, website, contact email | App name, display name |
| License, how to report bugs | App version (from the app's own version source) |
| The **list of debug fields** every app must show | Repo URL, issues URL |
| A reference debug-info collector (Python) | Build info: git commit, build date |
| The About section spec | The About UI itself (terminal / pywebview / web) |

**Rule:** You edit developer details in one place. somaari-common is **not versioned**: no tags, no pins, no version shown in apps. Only each app has its own version. Each app picks up the latest shared data from `main` when you refresh it (Prompt 4).

---

## 2. Why the design is language-neutral

Future apps may be in JavaScript/TypeScript, Go, Rust, shell, or something else. So the canonical shared content is plain JSON plus a Markdown spec, which any language can read. Python is just the first adapter.

```
somaari-common/
├── about/
│   ├── developer.json          ← CANONICAL developer info (edit this one file)
│   ├── developer.schema.json   ← JSON Schema validating developer.json
│   └── debug-fields.json       ← CANONICAL list of debug fields every app must report
├── python/
│   ├── pyproject.toml          ← packages somaari_about (pip-installable from git)
│   └── somaari_about/
│       ├── __init__.py
│       └── collect.py          ← Python reference collector
├── scripts/
│   └── sync-about.sh           ← copies about/*.json from main into any repo
├── tests/                      ← validates JSON + checks the Python collector covers every field
├── docs/
│   └── ABOUT_SPEC.md           ← THE STANDARD every somaari app must follow
├── CHANGELOG.md                ← dated entries, no version numbers
└── README.md
```

---

## 3. How an app consumes the shared part

| App language | How it gets the shared data | How it collects debug info |
|---|---|---|
| **Python** | pip git dependency on main: `somaari-common @ git+https://github.com/ashwinkrpi/somaari-common#subdirectory=python` | Uses `somaari_about.collect` |
| **Any other language** | Runs `scripts/sync-about.sh` to vendor `developer.json` and `debug-fields.json` from main into the app (e.g. `vendor/somaari-about/`) | Writes a small native collector that outputs **exactly** the keys in `debug-fields.json` |

A non-Python app with a natural package manager (e.g. npm) can later get its own adapter folder (`js/`, `go/` …) in somaari-common. Until then, vendoring the JSON is enough.

**Avoid:** git submodules (painful for contributors and Claude Code) and fetching developer info from the web at runtime (breaks offline use and phones home on every launch).

---

## 4. Steps, in order

### Step 0 — Prepare (5 minutes)
1. Decide the contact email you want shown publicly.
2. Decide the bug-report wording (e.g. "Open an issue on GitHub and paste the copied debug info").
3. Make sure you have committed or stashed any pending work in all three app repos.

### Step 1 — Create `somaari-common` (one Claude Code session)
1. Open Claude Code in the **parent folder** `~/code/ai-projects`.
2. Paste **Prompt 1** from `common-build-plan.md`.
3. Review the result: check `developer.json` and read `docs/ABOUT_SPEC.md` carefully, because it is the contract for every app.
4. Run the tests and commit.
5. Create the GitHub repo `ashwinkrpi/somaari-common` and push `main`.
   - **Make it public.** It only holds public developer info, and public apps must be able to install it without credentials.

### Step 2 — Integrate each app (one session per app)
Do the apps one at a time, each in its **own** Claude Code session opened **inside that app's folder**. This keeps context small and gives each repo a clean, separate commit.

| Order | App | Prompt |
|---|---|---|
| 1 | somaari-disk | Prompt 2 (general) + the somaari-disk notes |
| 2 | somaari-ai | Prompt 2 (general) + the somaari-ai notes |
| 3 | somaari-plan | Prompt 2 (general) + the somaari-plan notes |

For each app:
1. Run Prompt 2 with the app-specific notes appended.
2. Launch the app and open About. Check the version, the commit and the developer info.
3. Click **Copy debug info**, paste the result somewhere, and confirm it contains **no API keys or tokens**.
4. Commit.

Prompt 2 detects the app's language. If the app turns out not to be Python, the prompt uses the vendored-JSON path automatically.

### Step 3 — Verify consistency across apps
In a quick session at `~/code/ai-projects`, run **Prompt 3 (consistency audit)**. It checks that every app uses the current somaari-common data and reports every field in `debug-fields.json`.

---

## 5. Changing developer info later (the update flow)

1. Edit `somaari-common/about/developer.json`, and `debug-fields.json` if you are adding a field.
2. Add a dated entry to `CHANGELOG.md`. Prefer additive changes; mark any renamed or removed field, or other breaking change, as **BREAKING**. A new debug field means every app must then report it.
3. Run the tests, commit and push to `main`.
4. In each app, run **Prompt 4 (refresh from somaari-common)**. You can do this when you next release that app; it doesn't have to be the same day.
5. Run Prompt 3 (consistency audit) to confirm every app has the latest shared data.

---

## 6. Adding a future app

1. Create the app as usual.
2. Run **Prompt 5 (new app)** in the new app's folder. It works for Python and non-Python stacks.
3. Make sure the app's `CLAUDE.md` contains:
   `About section: follow somaari-common/docs/ABOUT_SPEC.md.`

---

## 7. Rules every app must follow (summary of ABOUT_SPEC.md)

- An About screen or command, reachable from the main UI (menu item, dialog, or `--about` / `about` command for terminal apps).
- A **Copy debug info** action that copies a plain-text block.
- **Never** show or copy secrets: API keys, tokens, passwords, or full URLs with credentials. Show provider and model names only.
- **No network calls** to build the About screen.
- The version comes from **one** source in the app. It is never hard-coded twice.
- Build commit and date are stamped at build or release time. If they are unavailable (e.g. running from source), show `dev` / `unknown`. Never crash.
- Developer info comes only from somaari-common, never retyped in the app.

---

## 8. Checklist

- [x] somaari-common created, tests passing, public on GitHub (2026-10-16)
- [ ] somaari-disk About done and verified (added 2026-10-16; not yet verified)
- [ ] somaari-ai About done and verified (added 2026-10-16; not yet verified)
- [ ] somaari-plan About done and verified (added 2026-10-16; not yet verified)
- [ ] Consistency audit passes
- [x] Each app's CLAUDE.md references ABOUT_SPEC.md (2026-10-16)
- [ ] Debug info checked for secrets in every app
