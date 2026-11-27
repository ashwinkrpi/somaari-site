import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "theme"
NETWORK = {
    "sites": [
        {"id": "apps", "label": "Apps", "url": "https://somaari.in/#apps", "icon": "apps", "group": "main"},
        {"id": "blog", "label": "Blog", "url": "https://blog.somaari.in/", "icon": "blog", "group": "main"},
        {"id": "games", "label": "Games", "url": "https://games.somaari.in/", "icon": "games", "group": "lab"},
    ],
    "social": {"github": "https://github.com/x", "youtube": "https://www.youtube.com/playlist?list=1"},
    "contact": {"general": "hello@somaari.in", "apps": "support@somaari.in"},
    "author": "A & B, Town",
}

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="needs node")


def _render(tmp_path, *flags):
    net = tmp_path / "network.json"
    net.write_text(json.dumps(NETWORK), encoding="utf-8")
    return subprocess.run(["node", str(THEME / "footer.mjs"), str(net), *flags],
                          capture_output=True, text=True, check=True).stdout


@needs_node
def test_footer_links_and_icons(tmp_path):
    html = _render(tmp_path)
    for text in ("Explore", "Follow", "Get in touch", "General inquiries", "App support", "GitHub",
                 "YouTube", "RSS", "About", "Privacy", "Terms", "Built by A &amp; B, Town"):
        assert text in html, text
    assert 'href="mailto:hello@somaari.in"' in html and 'href="mailto:support@somaari.in"' in html
    assert 'href="https://blog.somaari.in/rss.xml"' in html
    assert 'href="https://somaari.in/#apps"' in html and 'href="https://somaari.in/about/"' in html
    assert "footer-tag\">Lab" in html
    links = len(re.findall(r"<a ", html))
    assert links == len(re.findall(r"<svg ", html)) - html.count("footer-icon--end")  # every link has an icon


@needs_node
def test_local_flag_makes_somaari_links_relative(tmp_path):
    html = _render(tmp_path, "--local")
    assert 'href="/about/"' in html and 'href="/#apps"' in html
    assert 'href="https://blog.somaari.in/"' in html


def test_footer_css_uses_only_standard_tokens():
    standard = set(re.findall(r"^\| `(--[a-z-]+)`", (ROOT / "docs" / "THEME_SPEC.md").read_text(encoding="utf-8"), re.M))
    standard |= {"--shadow-hover"}
    used = set(re.findall(r"var\((--[a-z-]+)", (THEME / "footer.css").read_text(encoding="utf-8")))
    assert used - standard - {"--footer-max"} == set()
