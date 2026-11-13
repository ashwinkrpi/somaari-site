# Appendix A — Landing cards and docs.config.json (snapshot 2026-11-09)

Copied verbatim from `somaari-docs/docs/runner-plan.md` (Appendix A) so tests in this repo can check `apps/apps.json` against it. Do not edit by hand.

From somaari-site `index.html` lines 153–289 and `docs.config.json`.

```html
        <!-- CARD START: somaari-trip -->
        <li class="card">
          <!-- Demo: a still poster; "Watch demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: scripts/demo/somaari-trip/encode.sh -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/somaari-trip/poster.webp" width="720" height="406" alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="somaari-trip" data-title="GPS Route Viewer" data-video="/apps/somaari-trip/#video" hidden>Watch demo<span class="visually-hidden">: GPS Route Viewer</span></button>
          </div>
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">GPS Route Viewer</h3>
              <p class="card-repo">somaari-trip</p>
            </div>
            <!-- AI chip: somaari-trip README: "No accounts, no API keys, no third-party services." -->
            <span class="badges">
              <span class="badge badge--live">Available</span>
              <span class="badge badge--ai">No AI</span>
            </span>
          </div>
          <p class="card-desc">See where you went each day on a map, from the Overland iOS app's GPS logs: trips, stops, distance and speed. It runs in Docker on your own Raspberry Pi 5 or x86_64 Linux server, so your location history stays there.</p>
          <ul class="tags" aria-label="Tags">
            <li>Overland (iOS)</li>
            <li>Docker</li>
            <li>Maps</li>
          </ul>
          <div class="card-actions">
            <a class="btn" href="/apps/somaari-trip/">Details<span class="visually-hidden"> about GPS Route Viewer</span></a>
            <a class="btn btn--secondary" href="/apps/somaari-trip/#video"><span aria-hidden="true">&#x25B6;&#xFE0E;&nbsp;</span>Video<span class="visually-hidden">: GPS Route Viewer</span></a>
            <a class="btn btn--secondary" href="https://github.com/ashwinkrpi/somaari-trip">View on GitHub<span class="visually-hidden"> (somaari-trip)</span></a>
          </div>
        </li>
        <!-- CARD END: somaari-trip -->

        <!-- CARD START: somaari-disk -->
        <li class="card">
          <!-- Demo: a still poster; "Watch demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: scripts/demo/README.md -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/somaari-disk/poster.webp" width="720" height="406" alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="somaari-disk" data-title="Disk Usage Analyzer" data-video="/apps/somaari-disk/#video" hidden>Watch demo<span class="visually-hidden">: Disk Usage Analyzer</span></button>
          </div>
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">Disk Usage Analyzer</h3>
              <p class="card-repo">somaari-disk</p>
            </div>
            <!-- AI chip: somaari-disk README: "The app makes no network requests"; no AI dependencies. -->
            <span class="badges">
              <span class="badge badge--live">Available</span>
              <span class="badge badge--ai">No AI</span>
            </span>
          </div>
          <p class="card-desc">See what is using space on your drives, largest items first. Read-only and fully offline, for Linux (Raspberry Pi OS, Debian, Ubuntu and more) and Windows 10/11.</p>
          <ul class="tags" aria-label="Tags">
            <li>Desktop</li>
            <li>Linux</li>
            <li>Windows</li>
          </ul>
          <div class="card-actions">
            <a class="btn" href="/apps/somaari-disk/">Details<span class="visually-hidden"> about Disk Usage Analyzer</span></a>
            <a class="btn btn--secondary" href="/apps/somaari-disk/#video"><span aria-hidden="true">&#x25B6;&#xFE0E;&nbsp;</span>Video<span class="visually-hidden">: Disk Usage Analyzer</span></a>
            <a class="btn btn--secondary" href="https://github.com/ashwinkrpi/somaari-disk">View on GitHub<span class="visually-hidden"> (somaari-disk)</span></a>
          </div>
        </li>
        <!-- CARD END: somaari-disk -->

        <!-- CARD START: somaari-plan -->
        <li class="card">
          <!-- Demo: a still poster; "Watch demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: scripts/demo/README.md -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/somaari-plan/poster.webp" width="720" height="406" alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="somaari-plan" data-title="Task Planner" data-video="/apps/somaari-plan/#video" hidden>Watch demo<span class="visually-hidden">: Task Planner</span></button>
          </div>
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">Task Planner</h3>
              <p class="card-repo">somaari-plan</p>
            </div>
            <!-- AI chip: somaari-plan README: "AI optional ... mode = \"off\" works with no AI at all." -->
            <span class="badges">
              <span class="badge badge--live">Available</span>
              <span class="badge badge--ai">AI optional</span>
            </span>
          </div>
          <p class="card-desc">A small planner that runs on your own Raspberry Pi or other Linux machine. Turn Markdown plans, pasted notes or a quick line into dated tasks, with Today, calendar and board views. AI is optional: with it off, nothing leaves your Pi.</p>
          <ul class="tags" aria-label="Tags">
            <li>Planner</li>
            <li>Markdown</li>
            <li>Lightweight</li>
          </ul>
          <div class="card-actions">
            <a class="btn" href="/apps/somaari-plan/">Details<span class="visually-hidden"> about Task Planner</span></a>
            <a class="btn btn--secondary" href="/apps/somaari-plan/#video"><span aria-hidden="true">&#x25B6;&#xFE0E;&nbsp;</span>Video<span class="visually-hidden">: Task Planner</span></a>
            <a class="btn btn--secondary" href="https://github.com/ashwinkrpi/somaari-plan">View on GitHub<span class="visually-hidden"> (somaari-plan)</span></a>
          </div>
        </li>
        <!-- CARD END: somaari-plan -->

      </ul>
    </section>

    <section class="apps container" id="in-development" aria-labelledby="dev-heading">
      <h2 id="dev-heading">In development</h2>
      <ul class="card-grid" role="list">

        <!-- CARD START: somaari-terminal -->
        <li class="card">
          <!-- Demo: a still poster; "Watch demo" (shown by demo.js) plays the loop in the player
               dialog at the end of the page. Rebuild: scripts/demo/README.md -->
          <div class="card-media">
            <img class="card-demo" src="/assets/demos/somaari-terminal/poster.webp" width="720" height="406" alt="" loading="lazy">
            <button type="button" class="btn demo-open" data-demo="somaari-terminal" data-title="AI-assisted Terminal" hidden>Watch demo<span class="visually-hidden">: AI-assisted Terminal</span></button>
          </div>
          <div class="card-head">
            <div class="card-names">
              <h3 class="card-title">AI-assisted Terminal</h3>
              <p class="card-repo">somaari-terminal</p>
            </div>
            <!-- AI chip: somaari-terminal README: "Every AI key is optional." AI is its main feature. -->
            <span class="badges">
              <span class="badge badge--dev">In development</span>
              <span class="badge badge--ai">AI-powered</span>
              <span class="badge badge--ai">AI optional</span>
            </span>
          </div>
          <p class="card-desc">A smart terminal for the Raspberry Pi 5 and other Debian-based Linux with an X11 desktop: type commands or just say what you want in plain English. Local-first, and every AI-suggested command passes a safety check before it runs.</p>
          <ul class="tags" aria-label="Tags">
            <li>Raspberry Pi 5</li>
            <li>Terminal</li>
          </ul>
          <!-- Repo not public yet: no GitHub link. When it is public, add a "View on GitHub" link here
               (see README) and move this card up to the "Apps" section.
               TODO: its detail page needs a "How AI is used" section like apps/somaari-plan/, from the
               somaari-terminal README's Privacy section. -->
        </li>
        <!-- CARD END: somaari-terminal -->
```

```json
{
  "owner": "ashwinkrpi",
  "apps": [
    { "repo": "somaari-disk", "ref": "main", "src": "docs/GUIDE.md" },
    { "repo": "somaari-plan", "ref": "main", "src": "docs/GUIDE.md",
      "screenshot": {
        "rangoli": "docs/screenshots/theme-rangoli.png",
        "monsoon": "docs/screenshots/theme-monsoon.png",
        "pi-console": "docs/screenshots/theme-pi-console.png",
        "liquid-glass": "docs/screenshots/theme-liquid-glass.png",
        "rajyotsava": "docs/screenshots/theme-rajyotsava.png"
      },
      "demo": { "ref": "site-demo" } },
    { "repo": "somaari-trip", "ref": "main", "src": "docs/GUIDE.md" }
  ]
}
```

