"""Collect About/debug info as defined by somaari-common/docs/ABOUT_SPEC.md.

Standard library only, no network, never raises: every field falls back to
"unknown" / "dev" / "n/a".
"""

from __future__ import annotations

import json
import locale
import os
import platform
import re
import sys
import time
from importlib import metadata, resources
from pathlib import Path
from typing import Any, Callable, Iterable, Optional, Union

UNKNOWN = "unknown"
DEV = "dev"
NA = "n/a"
REDACTED = "[redacted]"

PathLike = Union[str, os.PathLike, None]

_SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bxox[abprs]-[A-Za-z0-9\-]{10,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}"),
    re.compile(r"(?i)\bbearer\s+\S+"),
    # URL with user:pass@
    re.compile(r"[A-Za-z][A-Za-z0-9+.\-]*://[^/\s:@]+:[^/\s@]+@"),
    # key=value style secrets, e.g. ?api_key=...
    re.compile(r"(?i)\b(?:api[_\-]?key|access[_\-]?token|token|secret|password|passwd|pwd)=[^&\s]+"),
    # long hex
    re.compile(r"\b[0-9a-fA-F]{32,}\b"),
    # long base64/url-safe token containing both letters and digits
    re.compile(r"(?=[A-Za-z0-9+_\-]*\d)(?=[A-Za-z0-9+_\-]*[A-Za-z])[A-Za-z0-9+_\-]{40,}={0,2}"),
]


# ---------------------------------------------------------------- data files

def _data_path(name: str) -> Any:
    packaged = resources.files("somaari_about").joinpath("data", name)
    if packaged.is_file():
        return packaged
    # Running from a source checkout: python/somaari_about/ -> ../../about
    return Path(__file__).resolve().parents[2] / "about" / name


def load_developer() -> dict:
    """Developer info from about/developer.json."""
    return json.loads(_data_path("developer.json").read_text(encoding="utf-8"))


def load_debug_fields() -> list[dict]:
    """Ordered debug field definitions from about/debug-fields.json."""
    return json.loads(_data_path("debug-fields.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------- redaction

def _looks_secret(value: str) -> bool:
    return any(p.search(value) for p in _SECRET_PATTERNS)


def redact(value: Any) -> Any:
    """Replace any string (or list item / dict value) that looks like a secret with "[redacted]"."""
    if isinstance(value, str):
        return REDACTED if _looks_secret(value) else value
    if isinstance(value, (list, tuple)):
        return [redact(v) for v in value]
    if isinstance(value, dict):
        return {k: redact(v) for k, v in value.items()}
    return value


# ---------------------------------------------------------------- collectors

def _safe(fn: Callable[[], Any], default: str = UNKNOWN) -> Any:
    try:
        value = fn()
    except Exception:
        return default
    if value is None or (isinstance(value, str) and not value.strip()):
        return default
    return value.strip() if isinstance(value, str) else value


def _os_name() -> str:
    system = platform.system()
    return {"Darwin": "macOS"}.get(system, system)


def _os_release() -> dict:
    if hasattr(platform, "freedesktop_os_release"):
        return platform.freedesktop_os_release()
    info = {}
    for line in Path("/etc/os-release").read_text(encoding="utf-8").splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            info[k] = v.strip().strip('"')
    return info


def _os_version() -> str:
    system = platform.system()
    if system == "Linux":
        return _os_release().get("PRETTY_NAME") or platform.version()
    if system == "Darwin":
        return platform.mac_ver()[0]
    if system == "Windows":
        return platform.release()
    return platform.version()


def _kernel() -> str:
    if platform.system() == "Windows":
        return platform.version()
    return platform.release()


def _device_model() -> str:
    for path in ("/proc/device-tree/model", "/sys/devices/virtual/dmi/id/product_name"):
        p = Path(path)
        if p.is_file():
            return p.read_bytes().replace(b"\x00", b"").decode("utf-8", "replace")
    return UNKNOWN


def _user_locale() -> str:
    lang, enc = locale.getlocale()
    if lang:
        return f"{lang}.{enc}" if enc else lang
    for var in ("LC_ALL", "LC_CTYPE", "LANG"):
        if os.environ.get(var):
            return os.environ[var]
    return UNKNOWN


def _timezone() -> str:
    lt = time.localtime()
    offset = lt.tm_gmtoff
    sign = "+" if offset >= 0 else "-"
    hours, minutes = divmod(abs(offset) // 60, 60)
    return f"{lt.tm_zone} (UTC{sign}{hours:02d}:{minutes:02d})"


def _dependencies(packages: Iterable[str]) -> list[str]:
    deps = []
    for name in packages:
        try:
            deps.append(f"{name}={metadata.version(name)}")
        except Exception:
            deps.append(f"{name}=not installed")
    return deps


def _dir(value: PathLike) -> str:
    return str(value) if value else NA


def collect(
    app_name: str,
    app_version: str,
    *,
    build_commit: Optional[str] = None,
    build_date: Optional[str] = None,
    packages: Iterable[str] = (),
    data_dir: PathLike = None,
    config_dir: PathLike = None,
    log_dir: PathLike = None,
    ai_provider: Optional[str] = None,
    ai_model: Optional[str] = None,
) -> dict:
    """Return the debug info dict. Keys are exactly the keys in debug-fields.json, in order."""
    values = {
        "app_name": _safe(lambda: app_name),
        "app_version": _safe(lambda: app_version),
        "build_commit": _safe(lambda: str(build_commit)[:12] if build_commit else None, DEV),
        "build_date": _safe(lambda: build_date),
        "os_name": _safe(_os_name),
        "os_version": _safe(_os_version),
        "kernel": _safe(_kernel),
        "architecture": _safe(platform.machine),
        "device_model": _safe(_device_model),
        "runtime_name": "Python",
        "runtime_version": _safe(platform.python_version),
        "key_dependencies": _safe(lambda: _dependencies(packages) or None, "none"),
        "data_dir": _safe(lambda: _dir(data_dir), NA),
        "config_dir": _safe(lambda: _dir(config_dir), NA),
        "log_dir": _safe(lambda: _dir(log_dir), NA),
        "ai_provider": _safe(lambda: ai_provider, NA),
        "ai_model": _safe(lambda: ai_model, NA),
        "locale": _safe(_user_locale),
        "timezone": _safe(_timezone),
    }
    try:
        keys = [f["key"] for f in load_debug_fields()]
    except Exception:
        keys = list(values)
    return {k: redact(values.get(k, UNKNOWN)) for k in keys}


# ---------------------------------------------------------------- text output

def _fmt(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return ", ".join(str(v) for v in value) if value else "none"
    if value is None or value == "":
        return UNKNOWN
    return str(value)


def as_text(info: dict, developer: dict) -> str:
    """Plain-text block for "Copy debug info". Format defined in ABOUT_SPEC.md."""
    lines = ["[somaari debug info]"]
    try:
        keys = [f["key"] for f in load_debug_fields()]
    except Exception:
        keys = list(info)
    for key in keys:
        lines.append(f"{key}: {_fmt(redact(info.get(key, UNKNOWN)))}")
    lines.append("[developer]")
    for key in ("name", "website", "email"):
        lines.append(f"{key}: {_fmt(redact(developer.get(key, UNKNOWN)))}")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":  # pragma: no cover
    sys.stdout.write(as_text(collect("somaari-common", "n/a"), load_developer()))
