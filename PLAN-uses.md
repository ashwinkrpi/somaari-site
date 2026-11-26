<!-- bg: branch build-guru/PLAN-uses -->
# /uses page: "What I use" (somaari-site)

Goal: a page at https://somaari.in/uses/ listing the apps on my iPhone 14, grouped by purpose, with my home screens and an App Store link for each app.

Source: `USES_SOURCE.md` (the app list) and `assets/uses/` (the screenshots and share image). Take every fact on the page from them.

## Decisions

- **D1. Where:** a `/uses/` page on somaari.in (the uses.tech convention), not a blog post or X thread. Blog and X link to it.
- **D2. Scope:** iPhone 14 apps only for now. The page is named "Uses" with an "iPhone 14" section, so a later "Raspberry Pi / home lab", "Laptop" or "Dev and AI tools" section needs no new URL.
- **D3. Built like `/about/`:** a hand-written static page `uses/index.html`. No framework, data file or build step: 64 apps is still easy to edit by hand between the `USES:iphone` markers. Revisit only if the blog needs to read the list.
- **D4. Icons only in screenshots.** Showing screenshots of my own home screen is fine. Icons are not copied out one by one or loaded from the App Store (the CSP is `img-src 'self'` anyway). The app list itself is text: name plus App Store link.
- **D5. Screenshots:** the 3 cleaned home screens (`uses-screens/`), already free of badges and of every app not marked `yes`. On the page they're one figure: 3 across on desktop, stacked on phones, each a WebP about 600 px wide. The canvas is for X, not the page (at 360 px each phone in it would be ~110 px wide).
- **D6. Privacy:** only `yes` apps appear, in the list and in the screenshots. Banks, cards, loans, insurance, work tools, Family Link, health and personal apps are left out, and the page does **not** mention them at all (no "plus my bank's apps" line).
- **D7. No favourites, no required "why" lines.** The page is the categories only; each app is a name and App Store link. A "why" line can be added to any app later in `USES_SOURCE.md`.
- **D8. Share image:** the X link preview should show the home screens, not the build's generic text card. That needs a small build change (Stage 3).

## How the site is built (findings)

- `somaari-site/` is plain static HTML/CSS on Cloudflare Pages; `scripts/build.mjs` copies the folders named in `PUBLISH` into `dist/`.
- Every page has the `<!-- SHARED HEADER -->` block (must match `index.html`, checked by `scripts/check-shared.mjs`) and a `<!-- SHARED FOOTER -->` block that the build replaces with somaari-common's `footer()`.
- `scripts/check-seo.mjs` and `scripts/check-shared.mjs` each have a hard-coded page list; `sitemap.xml` lists the non-app pages by hand.
- The build adds the Pagefind `data-pagefind-body` marker to every page, and an OG image (`dist/og/<slug>.png`) with an `og:image` tag; that tag is added even if the page already has one (`scripts/build.mjs:572`).
- `scripts/check-links.mjs` checks internal links only; App Store links are checked by hand (Stage 4).
- Themes: rangoli, monsoon, graphite, liquid-glass; preview one with `?theme=<id>`.
- Footer links come from somaari-common, so adding "Uses" to the footer is a somaari-common change (Part B).

## Tasks

### Stage 1: Content (manual, before running build-guru)
- [x] [manual] List the apps in `uses-apps.md` with a Keep? decision for each (64 `yes`, 11 categories: Dev/AI/self-hosting, Security and privacy, Smart home and network, Productivity and files, Communication and social, Entertainment and media, Travel, Shopping and food, Health and fitness, Apple built-ins, Payments).
- [x] [manual] Make the cleaned home screens (`uses-screens/build.py`).
- [x] [manual] ~~Pick 3–5 favourites~~ Skipped (D7).
- [x] [manual] Add the App Store link for each `yes` app (India store; Clips has none, Apple removed it). Optional "why" lines for the others.
- [x] [manual] Write `somaari-site/USES_SOURCE.md` from `uses-apps.md`: each category with its `yes` apps only (name, link, why if any), and a "Last updated" date. Nothing from the "Left out" section.
- [x] [manual] Convert the screens: `somaari-site/assets/uses/home-screen-{1,2,3}.webp` (600×1298, ~40–60 KB each) and the share image `somaari-site/assets/uses/og.png` (1200×630, same frame and fonts as the build's OG cards), made by `uses-screens/images.py`.

### Stage 2: The page
- [x] [moderate] Create `uses/index.html` by copying `about/index.html`: same `<head>` structure, shared header and footer blocks, and `<main id="main" class="detail docs container">`. Title `Uses · Somaari`, a meta description, canonical `https://somaari.in/uses/`, og:title, og:description, og:url. Heading "What I use", then a lead paragraph that says it's my iPhone 14 and shows "Last updated" from `USES_SOURCE.md` in a `<time datetime="YYYY-MM-DD">` element, then `<h2 id="iphone">iPhone 14</h2>`. <!-- bg: done sonnet 2026-11-27 -->
- [x] [moderate] Under the iPhone heading, add one `<figure>` with the 3 images from `assets/uses/` (`width`/`height` set, `loading="lazy"`, descriptive `alt` such as "Home screen 1 of 3: Apple apps and A–C") and a short `<figcaption>`. 3 across from about 720 px wide, stacked below that; no sideways scroll at 360 px. <!-- bg: done sonnet 2026-11-27 -->
- [x] [moderate] Fill the list from `USES_SOURCE.md`: one `<h3>` per category with a `<ul>` of apps, each `<a href="App Store URL" rel="noopener">Name</a>` plus its why line if it has one. Put the list between `<!-- USES:iphone -->` and `<!-- /USES:iphone -->`. Take every fact from `USES_SOURCE.md`; don't add apps, reasons or a line about apps left out (D6). <!-- bg: done sonnet 2026-11-27 -->
- [x] [simple] Add any styles needed to `style.css` (reuse `.prose` and existing list styles first; check at 360 px wide in every theme). Then run `node scripts/asset-versions.mjs`. <!-- bg: done claude 2026-11-27: nothing to change; task 8 already added the .uses-shots styles and ran asset-versions (checked with --check) -->

### Stage 3: Wire it into the site
- [x] [simple] Add `"uses"` to `PUBLISH` in `scripts/build.mjs`. <!-- bg: done haiku 2026-11-27 -->
- [x] [moderate] In `ogImages()` in `scripts/build.mjs`, skip generating an OG image for a page that already has `<meta property="og:image"`, but still add the Twitter card tags. Give `uses/index.html` `og:image` = `https://somaari.in/assets/uses/og.png` with width 1200, height 630 and an `og:image:alt`. Make sure `scripts/check-seo.mjs` accepts it (the image file must exist in `dist/`). <!-- bg: done sonnet 2026-11-27 -->
- [x] [simple] Add `"uses/index.html"` to the page lists in `scripts/check-seo.mjs` and `scripts/check-shared.mjs`. <!-- bg: done haiku 2026-11-27 -->
- [x] [simple] Add `https://somaari.in/uses/` to `sitemap.xml` with today's `<lastmod>`. <!-- bg: done haiku 2026-11-27 -->
- [x] [simple] Link to it from `about/index.html`: a short "What I use" paragraph linking to `/uses/`. <!-- bg: done haiku 2026-11-27 -->
- [x] [simple] Run `npm run build` and `npm run check`; check that `dist/uses/index.html` has exactly one `og:image` and that `/uses/` appears in Pagefind search results. <!-- bg: done claude 2026-11-27: build and check pass; one og:image; uses/ marked data-pagefind-body and indexed (9 fragments). Fixed: the build turned og.png into og.webp, now share images stay PNG -->

### Stage 4: Review and publish
- [ ] [manual] Preview with `python3 scripts/demo/serve.py 8000` (CSP applied): on a phone and desktop, in every theme (`?theme=rangoli`, `monsoon`, `graphite`, `liquid-glass`).
- [ ] [manual] Open every App Store link (nothing checks them automatically).
- [ ] [manual] Check the link preview with the X card validator (or post to yourself) once deployed.
- [ ] [manual] Merge `build-guru/PLAN-uses` to `main` (Cloudflare Pages deploys it).
