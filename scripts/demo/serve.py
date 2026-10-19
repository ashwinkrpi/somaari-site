"""Serve the built site (dist/, from npm run build) with the security headers from _headers (like Cloudflare Pages).

upgrade-insecure-requests is dropped so plain-http localhost still works.
Usage: python3 scripts/demo/serve.py [PORT]   (from the site root; default 8000)
"""

import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
HEADERS = []
for line in (ROOT / "_headers").read_text().splitlines():
    if line.startswith((" ", "\t")) and ":" in line:
        k, v = line.strip().split(":", 1)
        v = "; ".join(p.strip() for p in v.split(";") if p.strip() != "upgrade-insecure-requests")
        HEADERS.append((k.strip(), v))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / "dist"), **kw)

    def end_headers(self):
        for k, v in HEADERS:
            self.send_header(k, v)
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
