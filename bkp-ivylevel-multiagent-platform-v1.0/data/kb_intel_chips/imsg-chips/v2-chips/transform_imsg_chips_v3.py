
#!/usr/bin/env python3
"""
transform_imsg_chips_v3.py

Purpose:
  - Read existing iMessage chip files (JSON or JSONL)
  - Map to KBv6 iMessage schema with new chip types:
      Micro_Tactic_Chip, Tone_Cue_Chip, Escalation_Pattern_Chip, Message_Template_Chip, Turnaround_Case_Chip
  - Add situation_tag (heuristics) and cross-link metadata (week, phase, chip_family="imessage")
  - Re-ID chips with "IMSG-" prefix while preserving original id in metadata.original_chip_id
  - Emit a clean JSONL file suitable for re-embedding

Usage:
  python transform_imsg_chips_v3.py --input iMessage_Intel_Chips_Batch_v1.jsonl iMessage_Intel_Chips_Batch_v2.jsonl --output iMessage_Intel_Chips_Batch_v3.jsonl
"""
import argparse, json, re, sys, hashlib

NEW_TYPES = {
    "Micro_Tactic_Chip",
    "Tone_Cue_Chip",
    "Escalation_Pattern_Chip",
    "Message_Template_Chip",
    "Turnaround_Case_Chip",
}

# Heuristic keyword maps for type inference
KEYWORDS = {
    "Micro_Tactic_Chip": [
        "script", "reply", "micro-step", "micro tactic", "one-liner", "quick fix", "nudge", "follow-up", "check-in", "prompt", "dm", "sms", "text", "template snippet", "cta", "ask", "ping"
    ],
    "Tone_Cue_Chip": [
        "tone", "emoji", "calm", "gentle", "reassure", "validation", "empathy", "mirror", "encourage", "acknowledge", "permission", "no pressure", "celebrate", "confidence reset", "energy reset"
    ],
    "Escalation_Pattern_Chip": [
        "escalate", "if no response", "ladder", "after 24 hours", "after 3 days", "final nudge", "escalation", "cc parent", "cc counselor", "forward", "escalation path"
    ],
    "Message_Template_Chip": [
        "template", "copy-paste", "fill-in", "variable", "subject line", "signature", "boilerplate", "hello", "thank you note", "gratitude", "introduction", "cold email", "reach-out"
    ],
    "Turnaround_Case_Chip": [
        "before/after", "turned around", "went from", "immediately improved", "result:", "resolution", "fixed", "outcome", "success case", "case study", "transformed"
    ]
}

SITUATION_MAP = [
    ("deadline_crunch", ["deadline", "due tonight", "by midnight", "today", "tonight", "urgent", "time crunch", "rush"]),
    ("parent_pushback", ["mom", "dad", "parent", "parents", "pushback"]),
    ("confidence_reset", ["anxious", "nervous", "overwhelmed", "stressed", "imposter", "i can't", "cap myself", "panic"]),
    ("recommender_outreach", ["recommendation", "recommender", "lor", "teacher letter"]),
    ("blocker_unresponsive", ["no response", "didn't reply", "unresponsive", "ghosted"]),
    ("time_management", ["schedule", "time block", "168-hour", "calendar", "plan my week"]),
    ("scope_creep", ["too many", "scope", "reduce", "cut", "drop", "overcommitted"]),
    ("application_clarification", ["common app", "activities list", "essay prompt", "supplement", "app question"]),
    ("health_crisis", ["sick", "ill", "fever", "covid", "hospital"]),
    ("schedule_conflict", ["conflict", "can't attend", "overlap", "double booked"]),
    ("offer_evaluation", ["offer", "accept", "decline", "negotiate"]),
    ("scholarship_strategy", ["scholarship", "financial aid", "css profile", "fafsa"]),
    ("logistics_followup", ["share doc", "link below", "attachment", "pdf", "drive link"]),
    ("essay_block", ["stuck", "writer's block", "can't write", "brainstorm"]),
    ("testing_strategy", ["sat", "psat", "score", "practice test", "khan academy"]),
    ("interview_prep", ["interview", "mock", "prep", "questions"])
]

def infer_type(content: str, fallback: str) -> str:
    text = (content or "").lower()
    hits = []
    for t, kws in KEYWORDS.items():
        for k in kws:
            if k in text:
                hits.append(t); break
    if hits:
        # tie-break priority order (most iMessage-unique first)
        order = ["Message_Template_Chip","Micro_Tactic_Chip","Tone_Cue_Chip","Escalation_Pattern_Chip","Turnaround_Case_Chip"]
        hits = sorted(hits, key=lambda x: order.index(x) if x in order else 999)
        return hits[0]
    # Fallback mapping from existing types if present
    if fallback in NEW_TYPES:
        return fallback
    # map common legacy types
    legacy_map = {
        "Tactic_Chip": "Micro_Tactic_Chip",
        "Trust_Chip": "Tone_Cue_Chip",
        "Strategy_Chip": "Micro_Tactic_Chip",
        "Result_Chip": "Turnaround_Case_Chip"
    }
    return legacy_map.get(fallback, "Micro_Tactic_Chip")

def infer_situation(content: str) -> str:
    text = (content or "").lower()
    for tag, kws in SITUATION_MAP:
        if any(k in text for k in kws):
            return tag
    return "logistics_followup"

def make_imsg_id(original_id: str, new_type: str, idx: int) -> str:
    # Stable-ish: hash original_id to keep deterministic ordering, but keep human-friendly suffix
    h = hashlib.sha1(original_id.encode("utf-8")).hexdigest()[:6] if original_id else f"{idx:06d}"
    return f"IMSG-{new_type.replace('_','').upper()}-{h}"

def normalize_chip(obj: dict, idx: int) -> dict:
    # Required fields with fallbacks
    chip_id = obj.get("chip_id") or obj.get("id") or f"IMSG-TBD-{idx:06d}"
    content = obj.get("content") or obj.get("text") or ""
    ctype_in = obj.get("type") or obj.get("chip_type") or "Micro_Tactic_Chip"
    new_type = infer_type(content, ctype_in)
    # cross-links
    sd = obj.get("source_doc", {})
    week = sd.get("week") or obj.get("week") or obj.get("week_range") or "IMSG"
    phase = sd.get("phase") or obj.get("phase") or "IMSG"
    situation_tag = obj.get("situation_tag") or infer_situation(content)

    # new id
    new_id = make_imsg_id(str(chip_id), new_type, idx)

    meta = obj.get("metadata", {})
    meta["chip_family"] = "imessage"
    meta["original_chip_id"] = chip_id
    meta["situation_tag"] = situation_tag
    # optional scores
    for key in ["quality_score","confidence_score"]:
        if key not in meta:
            meta[key] = 0.9

    out = {
        "chip_id": new_id,
        "type": new_type,
        "source_doc": {
            "week": str(week),
            "phase": str(phase),
            "filename": sd.get("filename", obj.get("filename","iMessage")),
            "date": sd.get("date", obj.get("date",""))
        },
        "metadata": meta,
        "content": content.strip()
    }
    return out

def load_any(path):
    chips = []
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read().strip()
        # try JSON array first
        try:
            arr = json.loads(raw)
            if isinstance(arr, list):
                for i, x in enumerate(arr):
                    if isinstance(x, str):
                        try:
                            x = json.loads(x)
                        except Exception:
                            x = {"content": x}
                    chips.append(x)
                return chips
        except Exception:
            pass
        # fall back JSONL
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                chips.append(json.loads(line))
            except Exception:
                # minimal salvage
                chips.append({"content": line})
    return chips

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", nargs="+", required=True, help="iMessage chip files (JSON or JSONL)")
    ap.add_argument("--output", required=True, help="Output JSONL path")
    args = ap.parse_args()

    acc = []
    idx = 0
    for p in args.input:
        arr = load_any(p)
        for obj in arr:
            idx += 1
            acc.append(normalize_chip(obj, idx))

    with open(args.output, "w", encoding="utf-8") as w:
        for obj in acc:
            w.write(json.dumps(obj, ensure_ascii=False) + "\n")
    print(f"Wrote {len(acc)} chips → {args.output}")

if __name__ == "__main__":
    main()
