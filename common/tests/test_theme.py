import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from somaari_theme import files, static_dir

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "theme"
CSS = (THEME / "themes.css").read_text(encoding="utf-8")

needs_node = pytest.mark.skipif(shutil.which("node") is None, reason="needs node")


def _node(script):
    out = subprocess.run(["node", "-e", f"const t = require({json.dumps(str(THEME / 'theme.js'))});" + script],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def test_files_json_lists_every_file():
    on_disk = sorted(str(p.relative_to(THEME)) for p in THEME.rglob("*") if p.is_file() and p.name != "files.json")
    assert sorted(json.loads((THEME / "files.json").read_text(encoding="utf-8"))["files"]) == on_disk


def test_packaged_files_match_source():
    assert files() == json.loads((THEME / "files.json").read_text(encoding="utf-8"))["files"]
    for f in files():
        assert (static_dir() / f).read_bytes() == (THEME / f).read_bytes(), f


def test_font_urls_exist_and_have_a_licence():
    urls = re.findall(r'url\("([^"]+)"\)', CSS)
    assert urls
    for u in urls:
        assert (THEME / u).is_file(), u
    for family in {Path(u).stem.split("-")[0] for u in urls}:
        assert (THEME / "fonts" / f"OFL-{family}.txt").is_file(), family


@needs_node
def test_every_theme_has_a_css_block_and_schedule_uses_known_themes():
    meta = _node("console.log(JSON.stringify({themes: Object.keys(t.THEMES), schedule: t.SCHEDULE.map(e => e.theme),"
                 " default: t.DEFAULT_THEME}))")
    for th in meta["themes"]:
        assert f':root[data-theme="{th}"]' in CSS, th
    assert set(meta["schedule"]) <= set(meta["themes"])
    assert meta["default"] in meta["themes"]


@needs_node
def test_theme_schedule():
    # No seasonal themes are scheduled now, so every date gets the default.
    dates = ["2026-10-18T12:00:00+05:30", "2026-11-03T12:00:00+05:30", "2027-01-01T12:00:00+05:30",
             "2027-11-03T12:00:00+05:30"]
    got = _node(f"console.log(JSON.stringify({json.dumps(dates)}.map(d => t.getDefaultTheme(new Date(d)))));")
    assert got == ["rangoli"] * len(dates)


@needs_node
def test_schedule_matching():
    # How entries match, using sample entries: dates are judged by the calendar day in India (UTC+5:30).
    entries = [{"from": "2027-03-01", "to": "2027-03-03", "theme": "monsoon"},
               {"monthDay": ["11-01", "11-07"], "theme": "pi-console"},
               {"monthDay": ["12-30", "01-02"], "theme": "liquid-glass"}]  # wraps the new year
    cases = {
        "2027-02-28T23:59:00+05:30": "rangoli",
        "2027-03-01T00:00:00+05:30": "monsoon",
        "2027-03-03T23:59:00+05:30": "monsoon",
        "2027-03-04T00:00:00+05:30": "rangoli",
        "2026-10-31T18:45:00Z": "pi-console",  # 1 Nov 00:15 in India
        "2026-10-31T18:29:59Z": "rangoli",  # 31 Oct 23:59 in India
        "2027-11-07T23:59:00+05:30": "pi-console",
        "2027-11-08T00:00:00+05:30": "rangoli",
        "2026-12-31T12:00:00+05:30": "liquid-glass",
        "2027-01-02T12:00:00+05:30": "liquid-glass",
        "2027-01-03T12:00:00+05:30": "rangoli",
    }
    got = _node(f"t.SCHEDULE.push(...{json.dumps(entries)}); const c = {json.dumps(cases)};"
                "console.log(JSON.stringify(Object.keys(c).map(d => t.getDefaultTheme(new Date(d)))));")
    assert dict(zip(cases, got)) == cases
