import json
import re
import shutil
import subprocess
from pathlib import Path

import jsonschema
import pytest

from somaari_about import as_text, collect, load_debug_fields, load_developer, redact

ROOT = Path(__file__).resolve().parents[1]
ABOUT = ROOT / "about"


def _json(name):
    return json.loads((ABOUT / name).read_text(encoding="utf-8"))


def test_developer_validates_against_schema():
    jsonschema.validate(_json("developer.json"), _json("developer.schema.json"))


def test_packaged_data_matches_source():
    assert load_developer() == _json("developer.json")
    assert load_debug_fields() == _json("debug-fields.json")


def test_debug_field_keys_unique_snake_case():
    keys = [f["key"] for f in _json("debug-fields.json")]
    assert len(keys) == len(set(keys))
    for key in keys:
        assert re.fullmatch(r"[a-z][a-z0-9]*(_[a-z0-9]+)*", key), key


def test_debug_fields_shape():
    for f in _json("debug-fields.json"):
        assert set(f) == {"key", "label", "description", "required"}
        assert isinstance(f["required"], bool)


def test_no_somaari_common_version_field():
    keys = {f["key"] for f in _json("debug-fields.json")}
    assert "somaari_common_version" not in keys
    assert "version" not in _json("developer.json")


def test_collect_returns_exact_keys_with_defaults():
    info = collect(None, None)
    assert list(info) == [f["key"] for f in _json("debug-fields.json")]
    assert info["build_commit"] == "dev"
    assert info["build_date"] == "unknown"
    assert info["ai_provider"] == "n/a"
    assert info["key_dependencies"] == "none"
    assert all(v not in (None, "") for v in info.values())


def test_collect_with_args():
    info = collect(
        "demo", "1.2.3",
        build_commit="0123456789abcdef0123456789abcdef01234567",
        build_date="2026-10-16",
        packages=("pytest", "definitely-not-a-real-package"),
        data_dir=Path("/tmp/data"),
        ai_provider="openrouter",
        ai_model="some/model",
    )
    assert info["build_commit"] == "0123456789ab"
    assert info["data_dir"] == "/tmp/data"
    assert info["key_dependencies"][1] == "definitely-not-a-real-package=not installed"
    assert info["key_dependencies"][0].startswith("pytest=")


@pytest.mark.parametrize("secret", [
    "sk-or-v1-abcdef1234567890",
    "sk-ant-api03-AbCdEf123456",
    "ghp_abcdefghijklmnopqrstuvwxyz0123",
    "https://user:hunter2@example.com/v1",
    "https://api.example.com/v1?api_key=abc123",
    "Bearer abc.def.ghi",
    "AKIAABCDEFGHIJKLMNOP",
    "0123456789abcdef0123456789abcdef",
    "QWxhZGRpbjpvcGVuIHNlc2FtZQ0123456789abcdefXYZ==",
])
def test_redaction_catches_secrets(secret):
    assert redact(secret) == "[redacted]"
    assert redact(["ok", secret]) == ["ok", "[redacted]"]


@pytest.mark.parametrize("safe", [
    "openrouter", "anthropic/claude-sonnet", "/home/ashwin/code/ai-projects/somaari-common/data",
    "6.12.96+rpt-rpi-v8", "Raspberry Pi 5 Model B Rev 1.0", "tokenizers=0.15.2", "https://somaari.in",
])
def test_redaction_keeps_normal_values(safe):
    assert redact(safe) == safe


def test_secrets_never_reach_output():
    info = collect("demo", "1.0", ai_provider="sk-or-v1-abcdef1234567890",
                   ai_model="https://u:p@host/x")
    assert info["ai_provider"] == "[redacted]"
    assert info["ai_model"] == "[redacted]"
    text = as_text({**info, "ai_provider": "sk-live-1234567890abcdef"}, load_developer())
    assert "sk-" not in text and "u:p@" not in text


def test_as_text_format():
    info = collect("demo", "1.0")
    lines = as_text(info, load_developer()).splitlines()
    keys = [f["key"] for f in _json("debug-fields.json")]
    assert lines[0] == "[somaari debug info]"
    assert [line.split(":", 1)[0] for line in lines[1:1 + len(keys)]] == keys
    assert lines[1 + len(keys)] == "[developer]"
    assert lines[-3:] == ["name: Ashwin", "website: https://somaari.in", "email: hello@somaari.in"]


@pytest.mark.skipif(shutil.which("sh") is None, reason="needs sh")
def test_sync_script(tmp_path):
    has_main = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--verify", "--quiet", "main"],
                              capture_output=True).returncode == 0
    if not has_main:
        pytest.skip("no main branch yet")
    result = subprocess.run(["sh", str(ROOT / "scripts" / "sync-about.sh"), str(tmp_path / "v")],
                            capture_output=True, text=True)
    if "uncommitted changes" in result.stderr:
        pytest.skip("about/ has uncommitted changes")
    assert result.returncode == 0, result.stderr
    assert sorted(p.name for p in (tmp_path / "v").iterdir()) == ["debug-fields.json", "developer.json"]


def test_locale_and_timezone_detected(monkeypatch):
    monkeypatch.setenv("LANG", "en_US.UTF-8")
    info = collect("demo", "1.0")
    assert info["locale"] != "unknown"
    assert "UTC" in info["timezone"]
