# somaari-site

The public web side of Somaari, in one repo since 2026-11-27:

| Folder | What | Published as |
|---|---|---|
| [`site/`](site/) | somaari.in: plain static HTML and CSS | Cloudflare Pages (root directory `site`) |
| [`docs/`](docs/) | docs.somaari.in: the app guides, built with Astro Starlight | Cloudflare Workers, by `.github/workflows/docs-deploy.yml` |
| [`common/`](common/) | Shared themes, About data and the app manifest (`apps/apps.json`) used by both sites and by every Somaari app | Read in place by `site/` and `docs/`; Python apps install `common/python` |

A change to `common/` (a theme, the app list) reaches both sites in the same commit.

`common/` and `docs/` were the separate repos `somaari-common` and `somaari-docs`; their full
history was merged in (`git log -- common/` or `git log -- docs/`). Those repos are archived.

## Using common/ from another repo

Python apps:

```
somaari-common @ git+https://github.com/ashwinkrpi/somaari-site#subdirectory=common/python
```

Other apps download or copy files from `common/theme/` and `common/about/` (see
[common/README.md](common/README.md), "How apps pick up changes").

## Workflows

| Workflow | When | What |
|---|---|---|
| `docs-deploy.yml` | push to `main` touching `docs/` or `common/` | build, smoke test and deploy docs.somaari.in |
| `docs-refresh.yml` | hourly | redeploy docs.somaari.in when an app guide changed in its repo |
| `common-tests.yml` | push or PR touching `common/` | the common/ tests |

somaari.in is built by Cloudflare Pages on every push to `main` (build watch paths: `site/**`,
`common/**`).

## License

MIT (see `site/LICENSE` and `common/LICENSE`).
