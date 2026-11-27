# The shared footer

One footer for every Somaari site, so a change here reaches all of them.

- `theme/footer.mjs`: `footer(network, { local })` returns the HTML. Run as `node footer.mjs <network.json> [--local]` it prints it, for sites that are not written in JavaScript (somaari-games).
- `theme/footer.css`: the styles. They use only the standard theme tokens (`--card-bg`, `--line`, `--fg`, `--subtle`, `--accent`), so every theme styles the footer. `--footer-max` sets the content width (default `72rem`).

Both are listed in `theme/files.json`, so every site that already gets `theme/` gets them with no new sync step.

## What it shows

Explore (one tile per site in `network.json`, Lab marked), Follow (YouTube, RSS), Get in touch (general inquiries and app support, each with an envelope; GitHub, with an arrow because it leaves for another site), then About, Privacy and Terms and the author line. Every link has an icon.

## Using it

1. Load `/theme/footer.css` after `themes.css`.
2. Render `footer(network, { local })` where the page footer goes. `local: true` only on somaari.in, which writes its own links relative; other sites use the default, full `https://somaari.in/...` links.
3. Delete the site's own footer markup and CSS. The footer must not have per-site rules.

`network.json` is somaari.in's (`https://somaari.in/network.json`); sites keep a committed fallback copy.

## Changing it

Change `footer.mjs` and `footer.css` here and push to `main`. A push to `theme/**` rebuilds somaari.in; the others pick it up as described in the README's table.
