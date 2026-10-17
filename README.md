# somaari-site

Landing page for the Somaari apps, served at <https://somaari.in/>.

Plain static HTML and CSS: no build step, no frameworks, no CDNs. The only external requests are each theme's Google Fonts. The only JavaScript is `theme.js` (theme picker and seasonal default) and `demo.js` (lazy demo loops on the app cards). Hosted on Cloudflare Pages (build command: none, output directory: `/`).

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: header, intro, app cards, footer |
| `style.css` | All styles (mobile-first); the four themes are custom properties under `html[data-theme]` |
| `theme.js` | Picks the theme before first paint, the seasonal schedule, the header theme picker |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `favicon.svg` | "S" mark icon |
| `robots.txt` | Allows all crawlers, points to the sitemap |
| `sitemap.xml` | Single-URL sitemap for `https://somaari.in/` |
| `demo.js` | Loads/plays the card demo loops near the viewport; poster only with reduced motion or no JS |
| `assets/demos/<app>/` | Each card's `loop.webm`, `loop.mp4` (720 px, < 1 MB) and `poster.webp` |
| `scripts/test-theme.mjs` | Checks the seasonal schedule: `node scripts/test-theme.mjs` |
| `scripts/demo/` | Re-runnable recorders and the encoder for the demo loops (see its README) |
| `_headers` | Cloudflare Pages security headers (strict CSP: `'self'` plus Google Fonts, no inline styles or scripts) |

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (`_headers` only applies on Cloudflare Pages.)

Preview a theme without saving it by adding `?theme=<id>`, e.g. <http://localhost:8000/?theme=dasara-jamboo>.
Ids: `warm-tactile`, `liquid-glass`, `dasara-jamboo`, `rajyotsava`.

## Themes

The theme picker in the header saves the visitor's choice in `localStorage`; "Auto (seasonal)" clears it
and follows the date in India (Asia/Kolkata):

- 17–20 October 2026: `dasara-jamboo`
- 1–7 November, every year: `rajyotsava`
- Otherwise: `warm-tactile`

To add a festival, add an entry to `SCHEDULE` in `theme.js` (`from`/`to` for one-off dates,
`monthDay` for every year), add a case to `scripts/test-theme.mjs` and run it with node.
Theme styles only change colours, fonts, spacing and decoration; the page text is the same in every theme.

## Add a new app card

1. In `index.html`, copy one block from `<!-- CARD START: ... -->` to `<!-- CARD END: ... -->`.
2. Paste it inside `<ul class="card-grid">`, just before the closing `</ul>`.
3. Edit the name, description, tags and status badge. Badge classes:
   - `badge--dev` – In development
   - `badge--soon` – Coming soon
   - `badge--live` – Available
4. Link: only link a repo once it is **public**:
   ```html
   <a class="btn" href="https://github.com/ashwinkrpi/NAME">View on GitHub<span class="visually-hidden"> (NAME)</span></a>
   ```
   Until then leave the link out; the status badge already says where the app is.
5. Commit and push to `main`; Cloudflare Pages redeploys automatically.

## Other things to edit

- **Intro text:** between `<!-- INTRO -->` and `<!-- /INTRO -->` in `index.html`.
- **Contact:** the `<!-- CONTACT -->` comment in the footer; add `hello@somaari.in` once email forwarding is set up.
- **Copyright year:** hard-coded in the footer of `index.html` and `404.html` (no inline script, to keep the CSP strict).
- **Demo loops:** re-record and re-encode with `scripts/demo/` (see `scripts/demo/README.md`).
- **Sitemap date:** update `<lastmod>` in `sitemap.xml` after significant changes.

## Contributing

This is the source for a personal site and doesn't accept pull requests; only collaborators can
open them. If you spot a typo, broken link or other problem, please report it in
[Issues](https://github.com/ashwinkrpi/somaari-site/issues).
