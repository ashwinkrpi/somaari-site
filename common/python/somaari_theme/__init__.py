"""somaari themes (theme.js, themes.css, fonts) for Python web apps. See docs/THEME_SPEC.md."""

import json
from pathlib import Path

__all__ = ["files", "static_dir"]


def static_dir() -> Path:
    """Folder holding theme/ (theme.js, themes.css, fonts/). Serve it at /theme/."""
    packaged = Path(__file__).resolve().parent / "static"
    if packaged.is_dir():
        return packaged
    # Running from a source checkout: python/somaari_theme/ -> ../../theme
    return Path(__file__).resolve().parents[2] / "theme"


def files() -> list:
    """Paths (relative to static_dir()) an app must serve, from theme/files.json."""
    return json.loads((static_dir() / "files.json").read_text(encoding="utf-8"))["files"]
