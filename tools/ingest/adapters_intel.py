#!/usr/bin/env python3
"""
Universal INTEL Adapter v5.3 - Schema-agnostic recursive finder + DOCX recovery
Detects chip-shaped payloads anywhere in JSON tree using:
- Synonym maps + shape checks
- Filename metadata parsing
- Embedded DOCX text extraction
- Fallback to reflection for unparseable content
"""

import datetime
import json
import re
import hashlib
from typing import Any, Dict, List, Tuple

# ---------- Helpers ----------
def stable_hash(payload) -> str:
    """Generate deterministic hash from payload"""
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

def _norm_list(x):
    """Normalize to list"""
    if x is None:
        return []
    return x if isinstance(x, list) else [x]

def _iso(ts):
    """Parse timestamp if possible"""
    try:
        return datetime.datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
    except Exception:
        return None

def _parse_filename_meta(doc_id: str) -> Dict[str, Any]:
    """
    Extract YYYY-MM-DD, W###, P# from filenames like:
    2024-06-02_W047_P3-JUNIOR_TRANS-INTEL_CollegeAppKickoff.json
    """
    m = re.search(r'(?P<date>\d{4}-\d{2}-\d{2}).*?(?:_W(?P<w>\d{2,3}))?.*?(?:_P(?P<p>\d))?', doc_id)
    meta = {}
    if m:
        d = m.group('date')
        try:
            meta['started_at'] = datetime.datetime.fromisoformat(d)
        except:
            pass
        if m.group('w'):
            meta['week'] = int(m.group('w'))
        if m.group('p'):
            meta['phase'] = int(m.group('p'))
    return meta

def _title_of(it):
    """Extract title from various fields"""
    for k in ('title', 'name', 'label', 'artifact', 'goal', 'ask', 'framework', 'tactic'):
        if isinstance(it, dict) and it.get(k):
            return str(it.get(k))
    return None

def _mk(student_id, doc_id, chip_type, content_json, title=None, summary=None, tags=None, started_at=None, ended_at=None):
    """Create chip with deterministic ID and filename metadata fallback"""
    base = _parse_filename_meta(doc_id)
    if not started_at:
        started_at = base.get('started_at')
    chip_id = stable_hash([doc_id, chip_type, content_json])
    return {
        "chip_id": chip_id,
        "doc_id": doc_id,
        "student_id": student_id,
        "chip_type": chip_type,
        "title": title or _title_of(content_json),
        "summary": summary or (content_json.get("summary") if isinstance(content_json, dict) else None),
        "content_json": json.dumps(content_json, ensure_ascii=False),
        "tokens_est": None,
        "started_at": started_at,
        "ended_at": ended_at,
        "tags": tags or []
    }

# ---------- Synonym maps & shape tests ----------
SYN = {
    "jtbd": {"jtbd", "jobs_to_be_done", "job", "ask", "question", "goal", "desired_outcome"},
    "tactic": {"tactic", "technique", "intervention", "play", "method", "procedure"},
    "framework": {"framework", "model", "template", "system", "schema"},
    "micro_moment": {"micro_moment", "moment", "micro_interaction", "exchange", "turn"},
    "reflection": {"reflection", "insight", "lesson", "retrospective"},
    "success_path": {"success_path", "plan", "pathway", "milestones", "phase_chain", "checkpoints"},
    "style": {"style", "tone", "coach_style", "signature_moves", "dos_donts"}
}

def _looks_like_tactic(obj):
    """Check if object has tactic-like shape"""
    if not isinstance(obj, dict):
        return False
    keys = set(map(str.lower, obj.keys()))
    return ("name" in obj or "tactic" in keys) and any(k in keys for k in ("steps", "play", "checklist", "procedure"))

def _looks_like_framework(obj):
    """Check if object has framework-like shape"""
    if not isinstance(obj, dict):
        return False
    keys = set(map(str.lower, obj.keys()))
    return ("name" in obj or "framework" in keys) and any(k in keys for k in ("components", "pillars", "principles"))

def _looks_like_jtbd(obj):
    """Check if object has JTBD-like shape"""
    if not isinstance(obj, dict):
        return False
    return any(k in obj for k in ("ask", "goal", "desired_outcome", "blocking_issue", "question"))

def _looks_like_micro(obj):
    """Check if object has micro-moment-like shape"""
    if not isinstance(obj, dict):
        return False
    return any(k in obj for k in ("situation", "context", "coach", "coach_message", "student", "action", "result"))

def _looks_like_reflection(obj):
    """Check if object has reflection-like shape"""
    if not isinstance(obj, dict):
        return False
    return any(k in obj for k in ("insight", "theme", "lesson"))

def _looks_like_success(obj):
    """Check if object has success-path-like shape"""
    if not isinstance(obj, dict):
        return False
    return any(k in obj for k in ("success_path", "phase_chain", "checkpoints", "artifact", "goal_item", "steps"))

def _looks_like_style(obj):
    """Check if object has style-like shape"""
    if not isinstance(obj, dict):
        return False
    return any(k in obj for k in ("tone", "signature_moves", "dos", "donts"))

# ---------- Recursive walker ----------
def _walk(obj, path=""):
    """Recursively walk JSON tree yielding (path, node) tuples"""
    if isinstance(obj, dict):
        yield path, obj
        for k, v in obj.items():
            for pp, qq in _walk(v, f"{path}.{k}" if path else k):
                yield pp, qq
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            for pp, qq in _walk(v, f"{path}[{i}]"):
                yield pp, qq

def _key_hits(key: str) -> str:
    """Check if key matches any synonym family"""
    k = key.lower()
    for family, kws in SYN.items():
        if any(kw in k for kw in kws):
            return family
    return ""

# ---------- Main adapter ----------
def adapt_any(student_id: str, doc_id: str, payload: Dict[str, Any]) -> Tuple[List[Dict], List[Dict]]:
    """
    Universal adapter - recursively finds chip-shaped payloads anywhere in JSON
    Returns: (chips, links)
    """
    chips: List[Dict] = []
    links: List[Dict] = []

    # 0) Handle embedded DOCX text (v5.3)
    if isinstance(payload, dict) and payload.get("embedded_docx_text"):
        text = payload["embedded_docx_text"]
        # Sanitize text: remove control characters that cause PostgreSQL errors
        # Keep only printable ASCII + common unicode (letters, numbers, punctuation, whitespace)
        clean_text = ''.join(c for c in text if c.isprintable() or c in '\n\r\t')

        # 1) Split into sections by heading-like lines
        sections = re.split(r"\n(?=[A-Z][A-Za-z0-9 \-]{3,}\:)|\n{2,}", clean_text)
        # 2) Emit micro_moments from bullet-like lines; tactics from step-patterns
        bullets = [ln.strip(" -•\t") for ln in clean_text.splitlines() if re.match(r"^\s*[-•]\s+", ln)]
        steps   = [ln.strip() for ln in clean_text.splitlines() if re.match(r"^\s*(Step\s*\d+|[\(\[]?\d+[\)\]]\.)\s+", ln, flags=re.I)]

        # reflection (for full-retrieval) - use truncated text to avoid huge chips
        chips.append(_mk(student_id, doc_id, "reflection", {
            "who": "system",
            "theme": "DOCX Content Recovery",
            "insight": clean_text[:10000],
            "next_step": "Review extracted content" if len(clean_text) > 10000 else None
        }, title="Recovered DOCX"))

        # bullets → micro_moment
        for b in bullets[:200]:  # safety cap
            if len(b) > 10:  # skip very short bullets
                chips.append(_mk(student_id, doc_id, "micro_moment", {
                    "situation": None,
                    "coach_message": b[:500],  # cap length
                    "student_message": None,
                    "action_taken": None
                }, title=b[:80]))

        # steps → tactic skeleton
        if len(steps) >= 2:
            chips.append(_mk(student_id, doc_id, "tactic", {
                "name": "DOCX recovered steps",
                "goal": None,
                "steps": [s[:300] for s in steps[:50]],  # cap step length
                "evidence": [],
                "signals": []
            }, title="DOCX recovered steps"))

    # 1) Look for explicit layer containers if present
    layers = None
    if isinstance(payload, dict):
        for k in payload.keys():
            if "intelligence_layers" in k or "intelligence_layers_extracted" in k:
                layers = payload[k]
                break
    if isinstance(layers, dict):
        payloads_to_scan = [layers]
    else:
        payloads_to_scan = [payload]

    # 2) Walk everything; emit by shape and by key-hits (robust)
    for root in payloads_to_scan:
        for p, node in _walk(root):
            if not isinstance(node, (dict, list)):
                continue

            # A) Shape-based emission
            if _looks_like_tactic(node):
                chips.append(_mk(student_id, doc_id, "tactic", {
                    "name": node.get("name") or node.get("tactic") or "tactic",
                    "goal": node.get("goal") or node.get("purpose"),
                    "steps": node.get("steps") or node.get("play") or node.get("procedure") or node.get("checklist") or [],
                    "evidence": node.get("evidence") or node.get("artifacts") or [],
                    "signals": node.get("signals") or node.get("success_criteria") or []
                }, title=node.get("name")))
                continue

            if _looks_like_framework(node):
                chips.append(_mk(student_id, doc_id, "framework", {
                    "name": node.get("name") or node.get("framework"),
                    "components": node.get("components") or node.get("pillars") or node.get("principles") or [],
                    "when_to_use": node.get("when_to_use") or node.get("applicability"),
                    "expected_effect": node.get("expected_effect") or node.get("effect") or "",
                    "examples": node.get("examples") or []
                }, title=node.get("name")))
                continue

            if _looks_like_jtbd(node):
                chips.append(_mk(student_id, doc_id, "jtbd", {
                    "ask": node.get("ask") or node.get("question"),
                    "blocking_issue": node.get("blocking_issue") or node.get("blocker"),
                    "desired_outcome": node.get("desired_outcome") or node.get("goal"),
                    "deadline": node.get("deadline")
                }))
                continue

            if _looks_like_micro(node):
                chips.append(_mk(student_id, doc_id, "micro_moment", {
                    "situation": node.get("situation") or node.get("context"),
                    "coach_message": node.get("coach") or node.get("coach_message"),
                    "student_message": node.get("student") or node.get("student_message"),
                    "action_taken": node.get("action") or node.get("result")
                }))
                continue

            if _looks_like_reflection(node):
                chips.append(_mk(student_id, doc_id, "reflection", {
                    "who": node.get("who") or "coach",
                    "theme": node.get("theme"),
                    "insight": node.get("insight"),
                    "next_step": node.get("next_step")
                }))
                continue

            if _looks_like_success(node):
                chips.append(_mk(student_id, doc_id, "success_path", {
                    "artifact": node.get("artifact") or node.get("goal_item"),
                    "phase_chain": node.get("phase_chain") or node.get("steps") or [],
                    "checkpoints": node.get("checkpoints") or []
                }))
                continue

            if _looks_like_style(node):
                chips.append(_mk(student_id, doc_id, "style", {
                    "tone": node.get("tone"),
                    "signature_moves": node.get("signature_moves") or node.get("moves") or [],
                    "dos": node.get("dos") or [],
                    "donts": node.get("donts") or []
                }, title="coach style"))
                continue

            # B) Key-based emission (lists like tactics:[...], frameworks:[...])
            if isinstance(node, list) and p:
                fam = _key_hits(p.split('.')[-1])
                if fam in ("tactic", "framework", "jtbd", "micro_moment", "reflection", "success_path", "style"):
                    for it in node:
                        if not isinstance(it, dict):
                            it = {"note": str(it)}
                        chips.append(_mk(student_id, doc_id, fam, it, title=_title_of(it)))

    # 3) Deduplicate by chip_id
    uniq = {}
    for ch in chips:
        uniq[ch["chip_id"]] = ch
    chips = list(uniq.values())

    # 4) Fallback: if nothing extracted, emit reflection from whole payload
    if not chips:
        chips.append(_mk(student_id, doc_id, "reflection", {
            "who": "system",
            "theme": "Unstructured Content",
            "insight": str(payload)[:5000],
            "next_step": "Review and structure content"
        }, title="Fallback Content"))

    return chips, links
