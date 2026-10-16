# somaari-site

Landing page for the Somaari apps, served at <https://somaari.in/>.

Plain static HTML and CSS: no build step, no frameworks, no external fonts or CDNs. The only JavaScript is `demo.js` (lazy demo loops on the app cards). Hosted on Cloudflare Pages (build command: none, output directory: `/`).

## Files

| File | Purpose |
|---|---|
| `index.html` | The page: header, intro, app cards, footer |
| `style.css` | All styles (mobile-first, light/dark via `prefers-color-scheme`) |
| `404.html` | Not-found page (Cloudflare Pages serves it automatically) |
| `favicon.svg` | "S" mark icon |
| `robots.txt` | Allows all crawlers, points to the sitemap |
| `sitemap.xml` | Single-URL sitemap for `https://somaari.in/` |
| `demo.js` | Loads/plays the card demo loops near the viewport; poster only with reduced motion or no JS |
| `assets/demos/<app>/` | Each card's `loop.webm`, `loop.mp4` (720 px, < 1 MB) and `poster.webp` |
| `scripts/demo/` | Re-runnable recorders and the encoder for the demo loops (see its README) |
| `_headers` | Cloudflare Pages security headers (strict CSP: `'self'` only, no inline styles or scripts) |

## Preview locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (`_headers` only applies on Cloudflare Pages.)

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
