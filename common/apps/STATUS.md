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
- Passing: pytest (49 passed, 3 skipped); schema, AM-02 rule checks, `site-apps.yml` (differs from `site-theme.yml` only in comments, name and path filter), README "Contents". No secrets and none of the wording RU-02 bans. Nothing to check in a browser for this stage.
- Added: `test_manifest_apps_and_guides` checks `github` is `ashwinkrpi`, the 4 repos are in order (trip, disk, plan, terminal) and only trip, disk and plan have `guide {"ref":"main","src":"docs/GUIDE.md"}`. It skips until apps.json exists.
- **Blocker: `apps/apps.json` is missing.** Appendix A was not in this brief either (only its name was), so the copy can't be added without inventing it. Fix: run AM-01 with Appendix A pasted in, then add an exact-match test for every `title`/`description`.
- Still open: `demo`/`screenshot` are plain `object` in the schema (the `docs.config.json` shapes are in Appendix A).

## Stage 1.1 verify, retry (2026-11-10): still NOT verified
- pytest: 49 passed, 3 skipped (the apps.json tests). Nothing else changed.
- The retry brief again named Appendix A but did not include its text. No copy of it is in this repo, and reading `runner-plan.md` was denied (file tools are restricted to this repo). apps.json was not written, so no copy was invented.
- **To unblock:** paste Appendix A's text into the brief itself (titles, descriptions, tags, AI labels/sources, demo/screenshot), or copy it into this repo (for example `apps/APPENDIX_A.md`). Then write apps.json and the exact-match test.

## Stage 1.1, AM-01 completed by hand (2026-11-10)
- Copied Appendix A verbatim from `somaari-docs/docs/runner-plan.md` into `apps/APPENDIX_A.md` so this repo can check against it.
- Wrote `apps/apps.json` from it: trip, disk, plan (`live`, public, `detail_page`, `guide`), terminal (`dev`, not public, no Details link). `demo`/`screenshot` only on plan, as in `docs.config.json`. `ai.source` is the card's AI comment text, unchanged.
- Schema: `ai.label` may be a list, because the terminal card shows two AI chips ("AI-powered", "AI optional"). SC-02's card template must render one badge per label. The plain-Python checker now handles `anyOf`.
- Added `test_manifest_copy_matches_appendix_a`: every repo, `title` and `description` matches APPENDIX_A.md exactly, in order. pytest: 53 passed, 0 skipped.

## Stage 1.1 verify (2026-11-11): VERIFIED
- Done when is met: pytest 60 passed, 0 skipped; `apps/apps.json` has 4 apps (trip, disk, plan, terminal), 3 with `guide`; every `title` and `description` equals `apps/APPENDIX_A.md` word for word. AM-01, AM-02, AM-03 and the §3 rules hold; `site-apps.yml` differs from `site-theme.yml` only in comments, name and path filter.
- Stage added: `apps/apps.json`, `apps/apps.schema.json`, `apps/APPENDIX_A.md`, `tests/test_apps.py`, `.github/workflows/site-apps.yml`, README "Contents" entry.
- Fixed in this check: `demo` (`{"ref"}`) and `screenshot` (theme id to path) are now exact shapes in the schema, not plain `object`; new tests compare tags, AI chips and source, status, Details link, `public`, `guide`, `demo` and `screenshot` with APPENDIX_A.md; README step 1 now says a push to `apps/` also rebuilds somaari.in.
- Open: `apps/APPENDIX_A.md` could not be compared with `runner-plan.md` from here (reads outside this repo are denied); diff the two once before merging. `ai.label` is a string or a list (terminal has two AI chips), which is wider than AM-01's wording; SC-02's card template must handle both.
- Open: somaari.in does not read `apps.json` yet (later stages), so until then the `site-apps.yml` rebuild changes nothing on the site. Nothing in this stage needs a browser check.
