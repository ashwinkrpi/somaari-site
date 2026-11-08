# somaari-docs

docs.somaari.in: Starlight (Astro) site that imports each public app's `docs/GUIDE.md` at build time. Served from Cloudflare Workers static assets, deployed with wrangler from the Pi. Full spec: `docs-subdomain-plan.md`.

## Saving tokens
- Don't read the whole plan. Read "Rules", "Decisions" and your stage only: `grep -n '^##\|^###' docs-subdomain-plan.md`, then Read that line range. Read "Current state" only when the stage touches somaari-site.
- In other repos, grep for the function or section you need (e.g. `grep -n 'function render' ../somaari-website/somaari-site/scripts/build-docs.mjs`). Don't read whole files.
- Never read `dist/`, `node_modules/`, `.astro/`, `public/theme/` or the generated `src/content/docs/<repo>/` whole. Use `grep`, `ls` or `head`. In Starlight's source, grep for the component you are overriding.
- Pipe long output: `npm run build 2>&1 | tail -30`, `npm ci --silent`, `wrangler ... | tail -15`.
- Don't re-read a file after you edit it. Prefer Edit over rewriting.
- `SPIKE.md` explains the theme bridge and the CSP rewrites in `scripts/postbuild.mjs`. Read it before touching either.
- No subagents. Keep replies to 3–5 lines: what changed, what was verified, the live URL, the next stage.

## Rules
- Automation first. Work through the stages without stopping. After each stage, run its checks, commit, deploy if it has a deploy, tick "Progress", and carry on. Stop only for an item the plan still marks **OWNER**, or for a check you can't make pass in 2 tries.
- somaari-docs: commit to `main` and push. Other repos: branch `docs-site/stage-N`, open a PR, and merge it yourself (`gh pr merge --squash --delete-branch`) once that repo's checks pass. Never use force-push or `--admin`.
- Never write a token, deploy-hook URL or other secret into a file. Never read `.env` or the wrangler config.
- Strict CSP: no `'unsafe-inline'` scripts, no external requests, self-hosted fonts, and never any "self-host" wording.
- Never hand-edit the theme files. They come from somaari-common.
- Follow each repo's own `CLAUDE.md`/`README.md` for commit style and checks.
- Problems found by the cron go to one GitHub issue through `scripts/notify.sh`, not to chat.

## Commands
```sh
npm run build -- --local ~/code/ai-projects       # build from sibling checkouts
npm run build                                      # build from GitHub
npm run check                                      # anchors, CSP, external hosts, self-host wording
npm run preview &                                  # dist/ + _headers on :8787 (wrangler dev can't run on the Pi)
npm run smoke -- http://127.0.0.1:8787             # headless: 5 themes, CSP, external requests, search
npx --yes wrangler@4 versions upload               # preview URL
npx --yes wrangler@4 deploy                        # production (after check passes)
npx --yes wrangler@4 rollback                      # if the live smoke test fails
```
