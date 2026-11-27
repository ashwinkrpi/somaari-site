"""Shared About section data and debug-info collector for somaari apps."""

from .collect import as_text, collect, load_debug_fields, load_developer, redact

__all__ = ["as_text", "collect", "load_debug_fields", "load_developer", "redact"]
