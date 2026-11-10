import copy
import json
import re
from pathlib import Path

import pytest

try:
    import jsonschema
except ImportError:  # the plain-Python checker below covers the schema keywords we use
    jsonschema = None

ROOT = Path(__file__).resolve().parents[1]
APPS = ROOT / "apps"
SCHEMA = json.loads((APPS / "apps.schema.json").read_text(encoding="utf-8"))
STATUSES = {"live", "dev", "soon"}

needs_manifest = pytest.mark.skipif(not (APPS / "apps.json").is_file(), reason="apps/apps.json not written yet")

# A made-up manifest used only to check that the checks themselves catch mistakes.
SAMPLE = {
    "github": "example",
    "apps": [
        {"repo": "somaari-one", "title": "One", "status": "live", "public": True, "description": "d",
         "tags": ["t"], "ai": {"label": "l", "source": "s"}, "detail_page": True,
         "guide": {"ref": "main", "src": "docs/GUIDE.md"}},
        {"repo": "somaari-two", "title": "Two", "status": "soon", "public": False, "description": "d",
         "tags": [], "ai": {"label": "l", "source": "s"}, "detail_page": False},
    ],
}


def _manifest():
    return json.loads((APPS / "apps.json").read_text(encoding="utf-8"))


def _schema_errors(value, schema=SCHEMA, path="$"):
    """Plain-Python check of the JSON Schema keywords apps.schema.json uses."""
    if "$ref" in schema:
        schema = SCHEMA["$defs"][schema["$ref"].removeprefix("#/$defs/")]
    errors = []
    kind = schema.get("type")
    types = {"object": dict, "array": list, "string": str, "boolean": bool}
    if kind and not (isinstance(value, types[kind]) and not (kind != "boolean" and isinstance(value, bool))):
        return [f"{path}: not {kind}"]
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path}: {value!r} not in {schema['enum']}")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            errors.append(f"{path}: too short")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path}: does not match {schema['pattern']}")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            errors.append(f"{path}: too few items")
        for i, item in enumerate(value):
            errors += _schema_errors(item, schema.get("items", {}), f"{path}[{i}]")
    if isinstance(value, dict):
        props = schema.get("properties", {})
        errors += [f"{path}: missing {k}" for k in schema.get("required", []) if k not in value]
        if schema.get("additionalProperties") is False:
            errors += [f"{path}: unexpected {k}" for k in value if k not in props]
        for k, sub in props.items():
            if k in value:
                errors += _schema_errors(value[k], sub, f"{path}.{k}")
    return errors


def _validate(manifest):
    if jsonschema is not None:
        jsonschema.validate(manifest, SCHEMA)
    assert _schema_errors(manifest) == []


def _rule_errors(manifest):
    """Rules the schema cannot express."""
    errors = []
    repos = [a["repo"] for a in manifest["apps"]]
    errors += [f"duplicate repo {r}" for r in sorted({r for r in repos if repos.count(r) > 1})]
    for a in manifest["apps"]:
        if "guide" in a and not a["public"]:
            errors.append(f"{a['repo']}: guide on a private repo")
        if a["status"] == "live" and a["detail_page"] is not True:
            errors.append(f"{a['repo']}: live without detail_page")
        if a["status"] not in STATUSES:
            errors.append(f"{a['repo']}: unknown status {a['status']!r}")
    return errors


def test_schema_is_valid_draft_2020_12():
    assert SCHEMA["$schema"] == "https://json-schema.org/draft/2020-12/schema"
    assert set(SCHEMA["$defs"]["app"]["properties"]["status"]["enum"]) == STATUSES
    if jsonschema is not None:
        jsonschema.Draft202012Validator.check_schema(SCHEMA)


@needs_manifest
def test_manifest_matches_schema():
    _validate(_manifest())


@needs_manifest
def test_manifest_rules():
    assert _rule_errors(_manifest()) == []


def test_sample_passes():
    _validate(SAMPLE)
    assert _rule_errors(SAMPLE) == []


def _broken(change):
    m = copy.deepcopy(SAMPLE)
    change(m)
    return m


@pytest.mark.parametrize("change", [
    lambda m: m["apps"][0].pop("title"),
    lambda m: m["apps"][0].update(public="yes"),
    lambda m: m["apps"][0].update(tags="t"),
    lambda m: m["apps"][0].update(detail_page=1),
    lambda m: m["apps"][0].update(status="beta"),
    lambda m: m["apps"][0].update(repo="other-app"),
    lambda m: m["apps"][0].update(extra=True),
    lambda m: m["apps"][0]["ai"].pop("source"),
    lambda m: m["apps"][0]["guide"].pop("ref"),
    lambda m: m.pop("github"),
    lambda m: m.update(apps=[]),
], ids=["no-title", "public-not-bool", "tags-not-list", "detail-page-not-bool", "bad-status", "bad-repo",
        "extra-field", "ai-no-source", "guide-no-ref", "no-github", "no-apps"])
def test_schema_catches_mistakes(change):
    m = _broken(change)
    assert _schema_errors(m)
    if jsonschema is not None:
        with pytest.raises(jsonschema.ValidationError):
            jsonschema.validate(m, SCHEMA)


@pytest.mark.parametrize("change, error", [
    (lambda m: m["apps"][1].update(repo="somaari-one"), "duplicate repo somaari-one"),
    (lambda m: m["apps"][0].update(public=False), "somaari-one: guide on a private repo"),
    (lambda m: m["apps"][0].update(detail_page=False), "somaari-one: live without detail_page"),
    (lambda m: m["apps"][1].update(status="beta"), "somaari-two: unknown status 'beta'"),
], ids=["duplicate-repo", "private-guide", "live-no-detail-page", "bad-status"])
def test_rules_catch_mistakes(change, error):
    assert _rule_errors(_broken(change)) == [error]
