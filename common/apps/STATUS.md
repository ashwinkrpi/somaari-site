# apps/ status

## Stage 1.1, sub-task 1 (AM-01): partly done, blocked
- Built `apps/apps.schema.json` (draft 2020-12): top-level `github` + `apps[]`; per app `repo`, `title`, `status` (live/dev/soon), `public`, `description`, `tags[]`, `ai{label,source}`, `detail_page`, optional `demo`, `screenshot`, `guide{ref,src}`.
- **Not built: `apps/apps.json`.** Appendix A (card titles, descriptions, tags, AI labels/sources, demo/screenshot values) was not in the brief, and reads outside this repo (runner-plan.md, somaari-site) were denied, so copy could not be copied without inventing it. Next session: give it Appendix A inline, then write apps.json (order trip, disk, plan, terminal; `guide {"ref":"main","src":"docs/GUIDE.md"}` for disk, plan, trip only).
- Open: `demo`/`screenshot` are plain `object` in the schema; tighten them to the `docs.config.json` shapes once those are visible. `jsonschema` availability in `.venv` not checked (command denied); AM-02 should fall back to plain Python.

## Stage 1.1, sub-task 2 (AM-02): done
- Added `tests/test_apps.py`: validates `apps/apps.json` against the schema (jsonschema if installed, which it is in `.venv`, plus a plain-Python checker that always runs), and checks unique repos, `guide` only when `public`, `live` ⇒ `detail_page: true`, status in live/dev/soon.
- A made-up in-memory sample checks that each schema rule and each extra rule catches its mistake (16 cases).
- Open: the two tests on the real `apps/apps.json` **skip** while the file is missing; Appendix A was again not in the brief, so apps.json is still unwritten (AM-01). The stage's final check (4 apps, 3 with `guide`, copy matching Appendix A) is not yet in the tests; add it with apps.json.

## Stage 1.1, sub-task 3 (AM-03): done
- Added `.github/workflows/site-apps.yml`: on a push to `apps/**` on `main` (or manual run), runs the tests, then POSTs `secrets.SOMAARI_SITE_DEPLOY_HOOK` exactly as `site-theme.yml` does.
- README "Contents" now lists `apps/` and says somaari.in and docs.somaari.in both read it from `main`.
- `site-apps.yml` was left untracked by the first attempt (its `git add` was denied); a retry session checked it against `site-theme.yml` (same steps, only the path filter and comments differ) and committed it.
- Open: `apps/apps.json` (AM-01) is still unwritten, so the workflow's tests currently skip the real-file checks.

## Stage 1.1 verify (2026-11-10): NOT verified
- Passing: pytest (49 passed, 3 skipped); schema, AM-02 rule checks, `site-apps.yml` (differs from `site-theme.yml` only in comments, name and path filter), README "Contents". No secrets or "self-host" wording. Nothing to check in a browser for this stage.
- Added: `test_manifest_apps_and_guides` checks `github` is `ashwinkrpi`, the 4 repos are in order (trip, disk, plan, terminal) and only trip, disk and plan have `guide {"ref":"main","src":"docs/GUIDE.md"}`. It skips until apps.json exists.
- **Blocker: `apps/apps.json` is missing.** Appendix A was not in this brief either (only its name was), so the copy can't be added without inventing it. Fix: run AM-01 with Appendix A pasted in, then add an exact-match test for every `title`/`description`.
- Still open: `demo`/`screenshot` are plain `object` in the schema (the `docs.config.json` shapes are in Appendix A).
