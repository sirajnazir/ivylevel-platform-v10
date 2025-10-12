#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
datagate_filter.py (v2, REAL DATA)
Usage:
  python3 scripts/datagate_filter.py --proof_score=0.9 --datasets all --export final_v8.jsonl
Env:
  DATABASE_URL=postgres://user:pass@host:port/db
"""

import argparse, json, os, re, sys, hashlib, datetime as dt
from collections import defaultdict
import psycopg2
import psycopg2.extras

# ---------- helpers ----------
EMAIL_RE = re.compile(r'([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})')
PHONE_RE = re.compile(r'(\+?\d{1,2}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})')

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

def redact_pii(text: str) -> str:
    if not text:
        return text
    text = EMAIL_RE.sub('[email]', text)
    text = PHONE_RE.sub('[phone]', text)
    return text

def tokens_rough(s: str) -> int:
    if not s:
        return 0
    return max(1, len(re.findall(r'\w+', s)))

def now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

def open_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)

def fetch_dicts(cur, sql, params=None):
    cur.execute(sql, params or [])
    cols = [c.name for c in cur.description]
    for row in cur.fetchall():
        yield dict(zip(cols, row))

# ---------- proof score gating ----------
def compute_proof_score(row):
    """5-factor: chip ref, content quality, timestamp recency, source id, tags"""
    f = 0.0

    # Factor 1: Has chip/outcome ID
    if row.get("chip_id") or row.get("outcome_id"):
        f += 0.2

    # Factor 2: Content quality (length)
    content = row.get("content") or row.get("text") or row.get("summary") or ""
    if tokens_rough(content) >= 12:
        f += 0.2

    # Factor 3: Timestamp recency (within last 2 years)
    ts = row.get("created_ts") or row.get("occurred_at")
    if ts:
        age_days = (dt.datetime.now(dt.timezone.utc) - ts).days if hasattr(ts, 'days') else 0
        if age_days < 730:  # 2 years
            f += 0.2

    # Factor 4: Has source reference
    if row.get("source_id"):
        f += 0.2

    # Factor 5: Has metadata/tags
    if row.get("tags") or row.get("meta"):
        f += 0.2

    return round(f, 3)

# ---------- formatters to OpenAI messages ----------
def make_record(user_text, assistant_text, meta):
    user_text = redact_pii((user_text or "").strip())
    assistant_text = redact_pii((assistant_text or "").strip())

    if not user_text or not assistant_text:
        return None

    MAX_CHARS = 1800
    return {
        "messages": [
            {"role": "system", "content": "You are Jenny, an empathetic college admissions coach who is proof-first and warm-direct."},
            {"role": "user", "content": user_text[:MAX_CHARS]},
            {"role": "assistant", "content": assistant_text[:MAX_CHARS]}
        ],
        "meta": meta
    }

# ---------- extractors ----------
def extract_tonecue(cur, min_score):
    """Extract empathetic coaching examples from micro_moment and tactic chips"""
    sql = """
      SELECT chip_id, chip_type, text, summary, phase, tags,
             created_ts, student_id, meta
      FROM kb_chips
      WHERE chip_type IN ('micro_moment', 'tactic')
        AND text IS NOT NULL
        AND LENGTH(text) > 50
      ORDER BY created_ts DESC
      LIMIT 2000
    """
    rows = list(fetch_dicts(cur, sql))
    out = []
    seen = set()

    for r in rows:
        content = r.get("text") or r.get("summary") or ""
        if tokens_rough(content) < 12:
            continue

        key = sha256(f"tonecue::{r['chip_id']}::{content}")
        if key in seen:
            continue
        seen.add(key)

        # Create natural user prompt
        user = "Help me with a warm, encouraging message for a student situation."

        meta = {
            "kind": "ToneCue",
            "chip_id": r["chip_id"],
            "chip_type": r.get("chip_type"),
            "phase": r.get("phase"),
            "created_at": str(r.get("created_ts")),
            "student_id": r.get("student_id")
        }

        score = compute_proof_score({"chip_id": r["chip_id"], "text": content,
                                     "created_ts": r.get("created_ts"), "tags": r.get("tags"),
                                     "meta": r.get("meta")})
        if score < min_score:
            continue

        meta["proof_score"] = score
        rec = make_record(user, content, meta)
        if rec:
            out.append(rec)

    return out

def extract_trustcue(cur, min_score):
    """Extract trust-building examples from interactions (jenny_reply)"""
    sql = """
      SELECT snippet_id, user_ask, jenny_reply, tactic_name, framework,
             occurred_at, student_id, source_id, tags, confidence
      FROM interactions
      WHERE jenny_reply IS NOT NULL
        AND LENGTH(jenny_reply) > 50
        AND excluded_from_tactic_scoring = false
      ORDER BY occurred_at DESC
      LIMIT 2000
    """
    rows = list(fetch_dicts(cur, sql))
    out = []
    seen = set()

    for r in rows:
        reply = r.get("jenny_reply") or ""
        ask = r.get("user_ask") or ""

        if tokens_rough(reply) < 12:
            continue

        key = sha256(f"trustcue::{r['snippet_id']}::{reply}")
        if key in seen:
            continue
        seen.add(key)

        # Use actual user ask if available, otherwise create one
        user = ask if ask else "I need credible, empathetic guidance on my situation."

        meta = {
            "kind": "TrustCue",
            "snippet_id": r["snippet_id"],
            "tactic_name": r.get("tactic_name"),
            "framework": r.get("framework"),
            "occurred_at": str(r.get("occurred_at")),
            "student_id": r.get("student_id"),
            "source_id": r.get("source_id")
        }

        score = compute_proof_score({"content": reply, "occurred_at": r.get("occurred_at"),
                                     "source_id": r.get("source_id"), "tags": r.get("tags")})
        if score < min_score:
            continue

        meta["proof_score"] = score
        rec = make_record(user, reply, meta)
        if rec:
            out.append(rec)

    return out

def extract_plangen(cur, min_score):
    """Extract multi-step planning examples from reflection and framework chips"""
    sql = """
      SELECT chip_id, chip_type, text, summary, phase, framework,
             tags, created_ts, student_id, meta
      FROM kb_chips
      WHERE chip_type IN ('reflection', 'framework', 'jtbd')
        AND text IS NOT NULL
        AND LENGTH(text) > 80
      ORDER BY created_ts DESC
      LIMIT 2000
    """
    rows = list(fetch_dicts(cur, sql))
    out = []
    seen = set()

    for r in rows:
        content = r.get("text") or r.get("summary") or ""
        if tokens_rough(content) < 15:
            continue

        key = sha256(f"plangen::{r['chip_id']}::{content}")
        if key in seen:
            continue
        seen.add(key)

        user = "Help me create a strategic plan for the next few weeks."

        meta = {
            "kind": "PlanGen",
            "chip_id": r["chip_id"],
            "chip_type": r.get("chip_type"),
            "framework": r.get("framework"),
            "phase": r.get("phase"),
            "created_at": str(r.get("created_ts")),
            "student_id": r.get("student_id")
        }

        score = compute_proof_score({"chip_id": r["chip_id"], "text": content,
                                     "created_ts": r.get("created_ts"), "tags": r.get("tags"),
                                     "meta": r.get("meta")})
        if score < min_score:
            continue

        meta["proof_score"] = score
        rec = make_record(user, content, meta)
        if rec:
            out.append(rec)

    return out

def extract_prooflink(cur, min_score):
    """Extract evidence-linked outcomes"""
    sql = """
      SELECT outcome_id, student_id, type, admission_result,
             details_json, occurred_at, source_id, lifecycle_item_id
      FROM outcomes
      WHERE details_json IS NOT NULL
      ORDER BY occurred_at DESC NULLS LAST
      LIMIT 2000
    """
    rows = list(fetch_dicts(cur, sql))
    out = []
    seen = set()

    for r in rows:
        # Build assistant response with outcome details
        outcome_type = r.get("type") or "outcome"
        admission_result = r.get("admission_result") or ""
        details = r.get("details_json") or {}

        # Extract key details
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except:
                details = {}

        label = details.get("label") or details.get("name") or outcome_type
        date_str = str(r.get("occurred_at") or "")[:10]

        # Build compact outcome statement
        parts = [label]
        if admission_result:
            parts.append(f"({admission_result})")
        if date_str:
            parts.append(f"on {date_str}")

        assistant = " ".join(parts)

        # Add evidence reference if available
        if r.get("lifecycle_item_id"):
            assistant += f"\nEvidence: lifecycle_item {r['lifecycle_item_id']}"
        if r.get("source_id"):
            assistant += f" (source: {r['source_id']})"

        if tokens_rough(assistant) < 8:
            continue

        key = sha256(f"prooflink::{r['outcome_id']}::{assistant}")
        if key in seen:
            continue
        seen.add(key)

        user = f"Confirm this outcome and cite sources: {label}"

        meta = {
            "kind": "ProofLink",
            "outcome_id": str(r["outcome_id"]),
            "outcome_type": outcome_type,
            "admission_result": admission_result,
            "occurred_at": str(r.get("occurred_at")),
            "source_id": r.get("source_id"),
            "student_id": r.get("student_id")
        }

        score = compute_proof_score({"outcome_id": r["outcome_id"], "content": assistant,
                                     "occurred_at": r.get("occurred_at"),
                                     "source_id": r.get("source_id")})
        if score < min_score:
            continue

        meta["proof_score"] = score
        rec = make_record(user, assistant, meta)
        if rec:
            out.append(rec)

    return out

# ---------- main ----------
def main():
    print("v8.0 Data Gate Filter")
    print("=" * 50)

    ap = argparse.ArgumentParser()
    ap.add_argument("--proof_score", type=float, default=0.9)
    ap.add_argument("--datasets", type=str, default="all", help="all|tone|trust|plan|proof (comma OK)")
    ap.add_argument("--export", type=str, default="final_v8.jsonl")
    args = ap.parse_args()

    print(f"Proof score threshold: {args.proof_score}")
    print(f"Output directory: ./data/training")
    print(f"Merged export: {args.export}")
    print()

    ds_str = args.datasets.lower()
    if ds_str == "all":
        ds = {"tone", "trust", "plan", "proof"}
    else:
        ds = set([d.strip() for d in ds_str.split(",")])

    conn = open_conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor)

    results = defaultdict(list)

    if "tone" in ds:
        print("Filtering ToneCue data...")
        results["ToneCue"] = extract_tonecue(cur, args.proof_score)
        print(f"✓ Extracted {len(results['ToneCue'])} ToneCue records")

    if "trust" in ds:
        print("Filtering TrustCue data...")
        results["TrustCue"] = extract_trustcue(cur, args.proof_score)
        print(f"✓ Extracted {len(results['TrustCue'])} TrustCue records")

    if "plan" in ds:
        print("Filtering PlanGen data...")
        results["PlanGen"] = extract_plangen(cur, args.proof_score)
        print(f"✓ Extracted {len(results['PlanGen'])} PlanGen records")

    if "proof" in ds:
        print("Filtering ProofLink data...")
        results["ProofLink"] = extract_prooflink(cur, args.proof_score)
        print(f"✓ Extracted {len(results['ProofLink'])} ProofLink records")

    # write split files
    os.makedirs("data/training", exist_ok=True)
    total = 0

    for kind, records in results.items():
        if not records:
            continue
        path = f"data/training/{kind.lower()}.jsonl"
        with open(path, "w", encoding="utf-8") as f:
            for r in records:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        print(f"✓ Exported {len(records)} records to {path}")
        total += len(records)

    # merged export
    merged = []
    for _, records in results.items():
        merged.extend(records)

    # deterministic order by proof_score desc then kind
    merged.sort(key=lambda r: (-(r.get("meta", {}).get("proof_score") or 0),
                               r.get("meta", {}).get("kind", "")))

    outp = f"data/training/{args.export}"
    with open(outp, "w", encoding="utf-8") as f:
        for r in merged:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print()
    print("=" * 50)
    print(f"✓ Exported {len(merged)} total records")
    print(f"✓ Files: {len(results)}")
    print(f"✓ Merged corpus: {outp}")
    print()

    # quality report
    by_kind = defaultdict(int)
    for r in merged:
        by_kind[r["meta"]["kind"]] += 1

    print("Summary by kind:")
    for kind, count in sorted(by_kind.items()):
        print(f"  {kind}: {count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
