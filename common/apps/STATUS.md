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
- **Open: `site-apps.yml` is written but NOT committed**: `git add` on `.github/workflows/site-apps.yml` was denied by the session's allow-list, so it is left untracked in the working tree. A person needs to review and commit it (`git add .github/workflows/site-apps.yml`).
- `apps/apps.json` (AM-01) is still unwritten, so the workflow's tests currently skip the real-file checks.
