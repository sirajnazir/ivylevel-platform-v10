#!/usr/bin/env python3
# tools/ingest/utils_json_repair_v56.py
import json, re
from typing import Any, Dict, Tuple

# Lazy import to avoid circular dependency
def _get_docx_extractor():
    try:
        from utils_docx_extract import maybe_extract_docx_from_textish
        return maybe_extract_docx_from_textish
    except ImportError:
        return lambda x: None

JSON_TRAIL_COMMA = re.compile(r',\s*([}\]])')
JSON_BARE_COMMA  = re.compile(r'":\s*,')
CTRL             = re.compile(r'[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]')

def load_json_tolerant(s: str) -> Dict[str, Any]:
    """Tolerant loader that fixes common LLM JSON mistakes and recovers embedded DOCX text."""
    if not s:
        return {}
    fixed = CTRL.sub('', s)
    fixed = JSON_BARE_COMMA.sub('": null,', fixed)
    fixed = JSON_TRAIL_COMMA.sub(r'\1', fixed)
    try:
        data = json.loads(fixed)
    except Exception:
        # last-ditch: wrap into {"raw": "..."} so callers can still extract text
        return {"raw": fixed}

    # Embedded DOCX recovery if applicable
    maybe_extract = _get_docx_extractor()
    for key in ("text", "segments"):
        v = data.get(key)
        if isinstance(v, str):
            recovered = maybe_extract(v)
            if recovered:
                data["embedded_docx_text"] = recovered
        elif isinstance(v, list):
            for part in v:
                if isinstance(part, str):
                    rec = maybe_extract(part)
                    if rec:
                        data["embedded_docx_text"] = rec
                        break
    return data

def coalesce_embed_text(payload: Dict[str, Any]) -> Tuple[str | None, str]:
    """
    Decide the best human-readable text from a heterogeneous INTEL payload.
    Returns (text, why_path).

    v5.6.2: Skip 'text' if it's structured JSON metadata (starts with '{')
    """
    # First check intelligence_layers_extracted for the actual extracted content
    intel = payload.get("intelligence_layers_extracted")
    if isinstance(intel, dict):
        for field in ["plain_text", "summary", "narrative"]:
            val = intel.get(field)
            if isinstance(val, str) and val.strip() and not val.strip().startswith("{"):
                return val.strip(), f"intelligence_layers_extracted.{field}"

    # Then check specialized text fields
    order = [
        ("embedded_docx_text", payload.get("embedded_docx_text")),
        ("reflection", payload.get("reflection")),
        ("tactic_text", payload.get("tactic_text")),
        ("micro_moment_text", payload.get("micro_moment_text")),
        ("framework_text", payload.get("framework_text")),
    ]
    for path, val in order:
        if isinstance(val, str) and val.strip() and not val.strip().startswith("{"):
            return val.strip(), path

    # Last resort: 'text' field, but only if it's NOT structured JSON
    text_val = payload.get("text")
    if isinstance(text_val, str) and text_val.strip():
        stripped = text_val.strip()
        # Skip if it starts with JSON structure markers
        if not (stripped.startswith("{") or stripped.startswith("[")):
            return stripped, "text"

    # Absolute last resort
    raw_val = payload.get("raw")
    if isinstance(raw_val, str) and raw_val.strip():
        return raw_val.strip(), "raw"

    return None, "not_found"
