# somaari-docs

The source of [docs.somaari.in](https://docs.somaari.in/): the guides for the somaari apps, built with [Starlight](https://starlight.astro.build/) (Astro) and served from Cloudflare Workers static assets.

No guide is written here. Each app keeps its guide in its own repository (`docs/GUIDE.md`), and this site copies it in at build time. The list of apps comes from the app manifest in [somaari-common](https://github.com/ashwinkrpi/somaari-common) (`apps/apps.json`), which somaari.in reads too.

## How guides get here

`npm run build` runs `scripts/build.mjs`, which:

1. **Imports the guides** (`scripts/import-guides.mjs`). It reads the manifest and, for every app with a `guide`, its Markdown and images (at `guide.ref`). It converts the guide for Starlight and writes it to `src/content/docs/<repo>/index.md`, with its images in `public/<repo>/`. Both are generated and git-ignored. The conversion:
   - drops `<!-- site:skip -->` … `<!-- /site:skip -->` blocks and the banner image;
   - uses the guide's first `# ` heading as the page title, or the manifest `title` if there is none;
   - turns GitHub alerts (`> [!NOTE]`) into Starlight asides;
   - points links to another published guide at its page here, and links to other files in the repo at GitHub;
   - adds a banner saying where the guide is kept, with a "View it on GitHub" link.
2. **Imports the themes** (`scripts/import-theme.mjs`): somaari-common's `theme/` files into `public/theme/`. Never edit those by hand.
3. Runs `astro build`.
4. **Makes `dist/` fit the strict CSP** (`scripts/postbuild.mjs`; see `SPIKE.md`).
5. **Versions the theme links** as `?v=<hash>` (`scripts/stamp-theme.mjs`).

The sidebar and the home page list the manifest's apps with a guide, in manifest order.

Heading ids are GitHub's, so links written for GitHub, such as `#-installation`, work here too.

## When the build fails

The import stops the build (exit 1) when:

- a guide or one of its images can't be read;
- a guide or an SVG it uses mentions self-hosting (the somaari sites never do);
- a guide uses an image from outside its own folder or from another site.

Fix these in the app's repository, not here.

`npm run check` then checks `dist/`:

- every `#anchor` link points at a heading that exists;
- the CSP in `_headers` has no `'unsafe-inline'` in `script-src`;
- every page loads only from its own origin (links to other sites must be https);
- no page mentions self-hosting.

## Local preview

From sibling checkouts of the app repos and somaari-common (nothing is fetched):

```sh
npm ci
npm run build -- --local ~/code/ai-projects
npm run check
npm test                                  # import tests (node --test)
npm run preview &                         # dist/ with _headers applied, on http://127.0.0.1:8787
npm run smoke -- http://127.0.0.1:8787    # headless Chromium: 5 themes, CSP, external requests, search
```

`npm run build` without `--local` reads everything from GitHub (`main` of somaari-common, `guide.ref` of each app).

`wrangler dev` can't run on the Pi (workerd needs a 48-bit address space), so `npm run preview` serves `dist/` with Node and applies `_headers` the way Cloudflare does. The smoke test uses the system Chromium (`CHROMIUM=/path` to override) through `playwright-core`; no browser is downloaded.

## How the site stays up to date

docs.somaari.in rebuilds itself; nothing in the app repositories triggers it. Every hour, cron runs `scripts/refresh.sh`, which:

1. Asks GitHub (`gh api`) for the latest commit touching each manifest guide's folder (its Markdown and images, at the guide's `ref`), and somaari-common's `theme/` and `apps/` on `main`.
2. Compares them with `.state/last-shas.json` (`scripts/refresh-state.mjs`). If nothing changed, it stops. `FORCE=1 bash scripts/refresh.sh` deploys anyway.
3. Runs `scripts/deploy.sh`: `npm ci`, build, check, upload a preview version, smoke-test the preview, deploy, smoke-test https://docs.somaari.in/, and roll back if that fails.
4. Saves the new SHAs only after a successful deploy, so a failed run is retried the next hour.

Everything is logged to `.state/refresh.log` (git-ignored). A failure opens one GitHub issue labelled `refresh-failed` with the last 50 log lines, or updates it if one is already open (`scripts/notify.sh`). The next good run closes it.

The cron line (runs at minute 23, through somaari-server's job runner):

```
23 * * * * /home/ashwin/.local/bin/somaari-server run-job somaari-docs -- /home/ashwin/code/ai-projects/somaari-docs/scripts/refresh.sh
```

Add it without touching the other jobs (never `crontab -r`, which deletes them all):

```sh
( crontab -l 2>/dev/null; echo '23 * * * * /home/ashwin/.local/bin/somaari-server run-job somaari-docs -- /home/ashwin/code/ai-projects/somaari-docs/scripts/refresh.sh' ) | crontab -
crontab -l | grep somaari-docs     # check it is there once
```

### First deploy

Done by hand once, after the Phase 2 stage branches are merged and pushed:

1. `bash scripts/deploy.sh`. If wrangler can't attach the custom domain, add `docs.somaari.in` to the `somaari-docs` Worker under Settings → Domains & Routes in the Cloudflare dashboard, then run it again.
2. `bash scripts/refresh.sh` twice: the first run deploys and saves the SHAs, the second logs "nothing changed; skip" (`tail .state/refresh.log`).
3. Add the cron line above.
4. Check https://docs.somaari.in/somaari-plan/#-installation loads.

## Adding an app

1. Add the app to somaari-common `apps/apps.json` (status `dev` or `soon` until it ships).
2. When it's public and has a guide, write `docs/GUIDE.md` in its repository and add `"guide": {"ref": "main", "src": "docs/GUIDE.md"}` to its manifest entry. docs.somaari.in picks it up on the next hourly refresh.
3. When it's live, give it a detail page on somaari.in and set `status: live` and `detail_page: true`. The docs home page then links to it.

No step copies text between repositories.

## Files

| Path | What |
| --- | --- |
| `scripts/build.mjs` | `npm run build`: the steps above |
| `scripts/import-guides.mjs`, `scripts/import-theme.mjs`, `scripts/lib.mjs` | the import steps, and reading files locally or from GitHub |
| `scripts/postbuild.mjs`, `scripts/stamp-theme.mjs` | CSP rewrites of `dist/`; theme versions |
| `scripts/check.mjs` | `npm run check` |
| `scripts/serve.mjs`, `scripts/smoke.mjs` | `npm run preview`, `npm run smoke` |
| `scripts/deploy.sh`, `scripts/refresh.sh`, `scripts/refresh-state.mjs`, `scripts/notify.sh` | deploy, hourly refresh, its SHA comparison, failure issue |
| `wrangler.jsonc` | the Worker: `dist/` as static assets on docs.somaari.in |
| `src/components/` | Starlight overrides: somaari header, footer, mobile menu, Appearance control, no theme script |
| `src/styles/somaari.css` | somaari tokens mapped onto Starlight, and the header and footer styles |
| `src/content/docs/index.mdx`, `404.md` | home page and 404 page; the guide folders beside them are generated |
| `public/_headers`, `public/robots.txt`, `public/favicon.svg` | site files |
| `tests/` | `node --test` tests for the import (with fixture guides) and the refresh SHA comparison |
| `SPIKE.md` | why the theme bridge and the CSP rewrites exist |
| `docs/runner-plan.md`, `docs/runner-status.md` | the build plan and its status |
