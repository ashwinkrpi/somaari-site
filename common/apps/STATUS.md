# apps/ status

## Stage 1.1, sub-task 1 (AM-01): partly done, blocked
- Built `apps/apps.schema.json` (draft 2020-12): top-level `github` + `apps[]`; per app `repo`, `title`, `status` (live/dev/soon), `public`, `description`, `tags[]`, `ai{label,source}`, `detail_page`, optional `demo`, `screenshot`, `guide{ref,src}`.
- **Not built: `apps/apps.json`.** Appendix A (card titles, descriptions, tags, AI labels/sources, demo/screenshot values) was not in the brief, and reads outside this repo (runner-plan.md, somaari-site) were denied, so copy could not be copied without inventing it. Next session: give it Appendix A inline, then write apps.json (order trip, disk, plan, terminal; `guide {"ref":"main","src":"docs/GUIDE.md"}` for disk, plan, trip only).
- Open: `demo`/`screenshot` are plain `object` in the schema; tighten them to the `docs.config.json` shapes once those are visible. `jsonschema` availability in `.venv` not checked (command denied); AM-02 should fall back to plain Python.
