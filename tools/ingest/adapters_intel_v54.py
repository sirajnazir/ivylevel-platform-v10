#!/usr/bin/env python3
"""
v5.4 Intel Adapters - Unify many schemas → 7 chip types
Future-proof, contributor-ready with metadata-rich chips
"""

import hashlib
import json
import re
from typing import Any, Dict, List, Optional
from utils_docx_extract import try_extract_docx_from_strings

KNOWN_TYPES = {"tactic", "micro_moment", "jtbd", "framework", "reflection", "success_path", "style"}

def sha_id(text: str, meta: Dict[str, Any]) -> str:
    """Generate deterministic hash from text + metadata."""
    h = hashlib.sha256()
    canonical = json.dumps({"text": text, "meta": meta}, sort_keys=True, ensure_ascii=False)
    h.update(canonical.encode("utf-8"))
    return "chip_" + h.hexdigest()

def coerce_meta(base: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize metadata fields for v5.4 schema."""
    return {
        "student_id": base.get("student_id", "huda-2025"),
        "source_kind": base.get("source_kind") or "TRANS-INTEL",
        "phase": base.get("phase"),
        "week": base.get("week"),
        "chip_date": base.get("date"),
        "award": base.get("award"),
        "activity": base.get("activity"),
        "framework": base.get("framework"),
        "metrics": base.get("metrics") or [],
        "confidence": base.get("confidence") or 0.9
    }

def _mk_chip(chip_type: str, text: str, base_meta: Dict[str, Any], extra: Dict[str, Any]) -> Dict[str, Any]:
    """Create a normalized chip with deterministic ID."""
    assert chip_type in KNOWN_TYPES, f"Invalid chip type: {chip_type}"

    clean_text = re.sub(r'\s+', ' ', (text or '')).strip()
    if not clean_text:
        return None

    meta = {**coerce_meta(base_meta), **extra}
    content_hash = hashlib.sha256(
        (clean_text + json.dumps(meta, sort_keys=True, ensure_ascii=False)).encode("utf-8")
    ).hexdigest()
    chip_id = "chip_" + content_hash

    return {
        "chip_id": chip_id,
        "content_hash": content_hash,
        "chip_type": chip_type,
        "text": clean_text,
        "meta": meta
    }

def auto_attach_embedded_docx(payload: dict) -> dict:
    """Auto-detect and attach embedded DOCX text if present."""
    text_fields = []
    for k in ("text", "raw", "payload", "segments"):
        v = payload.get(k)
        if isinstance(v, str):
            text_fields.append(v)
        elif isinstance(v, list):
            text_fields.extend([s for s in v if isinstance(s, str)])

    if text_fields:
        plain, strat = try_extract_docx_from_strings(text_fields)
        if plain:
            payload["_embedded_docx_text"] = plain
            payload["_embedded_docx_strategy"] = strat
    return payload

def detect_schema_and_extract(payload: Dict[str, Any], base_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Universal adapter: detect schema and extract chips.
    Supports v5.x INTEL schemas + DOCX recovery + generic formats.
    """
    chips: List[Dict[str, Any]] = []
    payload = auto_attach_embedded_docx(payload)

    # 1) v5.x INTEL-style (intelligence_layers_extracted)
    if "intelligence_layers_extracted" in payload:
        layers = payload["intelligence_layers_extracted"]

        # Frameworks
        for fw in layers.get("frameworks", []):
            desc = fw.get("description") or fw.get("name", "")
            chip = _mk_chip("framework", desc, base_meta, {"framework": fw.get("name")})
            if chip:
                chips.append(chip)

        # Tactics
        for t in layers.get("tactics", []):
            text = t.get("play") or t.get("description") or t.get("name", "")
            chip = _mk_chip("tactic", text, base_meta, {"confidence": t.get("confidence", 0.9)})
            if chip:
                chips.append(chip)

        # Micro moments
        for mm in layers.get("micro_moments", []):
            desc = mm.get("what") or mm.get("text") or mm.get("summary", "")
            chip = _mk_chip("micro_moment", desc, base_meta, {"confidence": mm.get("confidence", 0.9)})
            if chip:
                chips.append(chip)

        # JTBD
        for j in layers.get("jtbd", []):
            text = j.get("text") or j.get("job", "")
            chip = _mk_chip("jtbd", text, base_meta, {})
            if chip:
                chips.append(chip)

        # Reflections
        if "reflections" in layers:
            for r in layers["reflections"]:
                text = r.get("text", "")
                chip = _mk_chip("reflection", text, base_meta, {})
                if chip:
                    chips.append(chip)

    # 2) Hidden techniques discovered
    if "hidden_techniques_discovered" in payload:
        for name, data in payload["hidden_techniques_discovered"].items():
            text = data.get("summary") or name
            chip = _mk_chip("tactic", text, base_meta, {"framework": data.get("framework")})
            if chip:
                chips.append(chip)

    # 3) DOCX-recovered content
    if payload.get("_embedded_docx_text"):
        docx_text = payload["_embedded_docx_text"]
        chip = _mk_chip("reflection", docx_text[:5000], base_meta, {"source_kind": "DOCX-RECOVERED"})
        if chip:
            chips.append(chip)

    # 4) v5.3 format: {id, path, kind, text, segments, meta}
    if "text" in payload and isinstance(payload.get("text"), str) and payload.get("kind"):
        # This is v5.3 INTEL format - treat entire text as a reflection
        text = payload["text"]
        # Remove NUL bytes that cause PostgreSQL errors
        text = text.replace('\x00', '')
        chip = _mk_chip("reflection", text[:10000], base_meta, {"source_kind": payload.get("kind", "TRANS-INTEL")})
        if chip:
            chips.append(chip)

    # 5) Generic content/bullets/steps/highlights
    for key in ("content", "bullets", "steps", "highlights"):
        val = payload.get(key)
        if isinstance(val, list):
            for item in val:
                if isinstance(item, str) and item.strip():
                    chip = _mk_chip("micro_moment", item, base_meta, {})
                    if chip:
                        chips.append(chip)

    # De-dup by content_hash
    uniq = {}
    for c in chips:
        uniq[c["content_hash"]] = c
    return list(uniq.values())
