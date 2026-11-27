# Reference copies from somaari-site

Copied from https://github.com/ashwinkrpi/somaari-site so this site's header, "Somaari sites"
switcher and footer can match somaari.in. They are not loaded as-is; port what is needed into this
site's own code and styles.

- `partials.mjs`: `header(network, current)` and `footer(network)`, the markup built from `network.json`.
- `nav.js`: the phone drawer and the switcher behaviour.
- `style.css`: the header, switcher and footer styles (`.site-header`, `.header-*`, `.site-nav`,
  `.switcher*`, `.menu-toggle`, `.site-footer`, `.footer-*`).

`network.json` at the repo root is the committed copy of https://somaari.in/network.json, used as the
fallback when the live one can't be fetched at build time.
