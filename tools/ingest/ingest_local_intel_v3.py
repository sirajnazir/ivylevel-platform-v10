#!/usr/bin/env python3
"""
v5.2 - KB Ingestion with Universal INTEL Adapter
End-to-end production ingestion with schema-agnostic recursive finder
"""

import os
import sys
import csv
import json
import glob
import psycopg2
from typing import Dict, Any, List

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from utils_json_repair import try_load_json
from adapters_intel import adapt_any

DATABASE_URL = os.environ.get("DATABASE_URL")
STUDENT_ID   = os.environ.get("STUDENT_ID", "huda-2025")

INPUT_DIRS = [
    "data/canonical/jenny-huda/03-Intelligence-SessionTranscripts",
    "data/canonical/jenny-huda/02-Intelligence-ExecutionDocs",
    "data/canonical/jenny-huda/04-Intelligence-iMessage",
    "data/canonical/jenny-huda/01-Intelligence-GamePlan"
]
AUDIT_CSV = "artifacts/kb/ingest_audit.csv"
FIXME_DIR = "artifacts/kb/fixme"

UPSERT_DOC_SQL = """
INSERT INTO kb_docs
(doc_id, student_id, source_system, drive_file_id, filename, sha256, drive_path, domain)
VALUES (%(doc_id)s, %(student_id)s, %(source_system)s, %(drive_file_id)s, %(filename)s, %(sha256)s, %(drive_path)s, %(domain)s)
ON CONFLICT (doc_id) DO NOTHING
"""

UPSERT_CHIP_SQL = """
INSERT INTO kb_chips
(chip_id, doc_id, student_id, chip_type, title, summary, content_json, tokens_est, started_at, ended_at, tags)
VALUES (%(chip_id)s, %(doc_id)s, %(student_id)s, %(chip_type)s, %(title)s, %(summary)s, %(content_json)s, %(tokens_est)s, %(started_at)s, %(ended_at)s, %(tags)s)
ON CONFLICT (chip_id) DO UPDATE SET
  doc_id=EXCLUDED.doc_id,
  title=EXCLUDED.title,
  summary=EXCLUDED.summary,
  content_json=EXCLUDED.content_json,
  started_at=EXCLUDED.started_at,
  ended_at=EXCLUDED.ended_at,
  tags=EXCLUDED.tags
"""

def _conn():
    return psycopg2.connect(DATABASE_URL)

def _collect_files() -> List[str]:
    files = []
    for d in INPUT_DIRS:
        if os.path.exists(d):
            files += glob.glob(os.path.join(d, "*.json"))
    return sorted(files)

def _ensure_dirs():
    os.makedirs("artifacts/kb", exist_ok=True)
    os.makedirs(FIXME_DIR, exist_ok=True)

def _unwrap_intel(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract INTEL payload from wrapped structure"""
    # If already unwrapped, return as-is
    if "intelligence_layers_extracted" in payload or "tactics" in payload or "frameworks" in payload:
        return payload

    # Check for execution doc patterns
    for key in payload.keys():
        if isinstance(key, str) and ("_FRAMEWORK" in key or "STRATEGY" in key or "TECHNIQUE" in key):
            return payload

    # Try text field (with JSON repair)
    if "text" in payload and isinstance(payload["text"], str):
        try:
            inner, _ = try_load_json(payload["text"])
            return inner
        except:
            pass

    # Try segments (with JSON repair)
    if "segments" in payload and isinstance(payload["segments"], list):
        try:
            full_text = "".join(payload["segments"])
            inner, _ = try_load_json(full_text)
            return inner
        except:
            pass

    return payload

def main():
    _ensure_dirs()
    files = _collect_files()
    ok, fail, total = 0, 0, len(files)
    total_chips = 0
    audit_rows = []

    print(f"🚀 Starting v5.2 KB Intel Ingestion (Universal Adapter)...")
    print(f"📂 Found {total} files")
    print(f"🐘 Connecting to PostgreSQL...")

    with _conn() as cx, cx.cursor() as cur:
        for path in files:
            rel = os.path.relpath(path)
            filename = os.path.basename(path)

            # Skip non-INTEL files
            if "INTEL" not in filename.upper():
                continue

            try:
                raw = open(path, "r", encoding="utf-8", errors="ignore").read()
                wrapped, strategy = try_load_json(raw)

                # Unwrap INTEL payload
                payload = _unwrap_intel(wrapped)

                # Compute SHA256 for doc deduplication
                import hashlib
                doc_sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest()

                # Extract domain from path
                domain = "unknown"
                if "GamePlan" in rel:
                    domain = "gameplan"
                elif "ExecutionDocs" in rel:
                    domain = "execution"
                elif "SessionTranscripts" in rel:
                    domain = "sessions"
                elif "iMessage" in rel:
                    domain = "imessage"

                chips, links = [], []
                if isinstance(payload, dict) and "items" in payload and isinstance(payload["items"], list):
                    for idx, item in enumerate(payload["items"]):
                        doc_id = f"{rel}#item{idx}"
                        # Create doc record first
                        cur.execute(UPSERT_DOC_SQL, {
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "source_system": "local_intel",
                            "drive_file_id": path,
                            "filename": filename,
                            "sha256": doc_sha256,
                            "drive_path": os.path.dirname(rel),
                            "domain": domain
                        })
                        c, l = adapt_any(STUDENT_ID, doc_id, item if isinstance(item, dict) else {"text": str(item)})
                        chips.extend(c)
                        links.extend(l)
                else:
                    doc_id = rel
                    # Create doc record first
                    cur.execute(UPSERT_DOC_SQL, {
                        "doc_id": doc_id,
                        "student_id": STUDENT_ID,
                        "source_system": "local_intel",
                        "drive_file_id": path,
                        "filename": filename,
                        "sha256": doc_sha256,
                        "drive_path": os.path.dirname(rel),
                        "domain": domain
                    })
                    c, l = adapt_any(STUDENT_ID, doc_id, payload if isinstance(payload, dict) else {"text": str(payload)})
                    chips, links = c, l

                for ch in chips:
                    ch["tags"] = ch.get("tags") or []
                    if ch.get("tokens_est") is None:
                        ch["tokens_est"] = len(str(ch["content_json"])) // 4
                    cur.execute(UPSERT_CHIP_SQL, ch)
                    total_chips += 1

                ok += 1
                if len(chips) > 0:
                    print(f"   ✅ {filename} → {len(chips)} chips")
                else:
                    print(f"   ⚠️  {filename} → 0 chips")
                audit_rows.append([rel, "OK", strategy, len(chips)])
            except Exception as ex:
                fail += 1
                try:
                    with open(os.path.join(FIXME_DIR, os.path.basename(rel)), "w", encoding="utf-8") as fw:
                        fw.write(raw)
                except:
                    pass
                print(f"   ❌ {filename} → {ex.__class__.__name__}", file=sys.stderr)
                audit_rows.append([rel, f"FAIL: {ex.__class__.__name__}: {str(ex)[:100]}", "-", 0])

    with open(AUDIT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["file", "status", "parse_strategy", "chips"])
        w.writerows(audit_rows)

    print("\n" + "=" * 60)
    print("✅ KB INTEL INGESTION COMPLETE (v5.2)")
    print("=" * 60)
    print(f"Files processed:   {ok}/{total} ({(ok/total*100):.1f}% success)")
    print(f"Files failed:      {fail}")
    print(f"Total chips:       {total_chips}")
    print(f"\nArtifacts:")
    print(f"  📄 Audit:  {AUDIT_CSV}")
    print(f"  📁 Fixme:  {FIXME_DIR}/")

    # Query chip stats
    with _conn() as cx, cx.cursor() as cur:
        cur.execute(
            "SELECT chip_type, COUNT(*) as cnt, SUM(tokens_est) as total_tokens "
            "FROM kb_chips WHERE student_id=%s GROUP BY chip_type ORDER BY cnt DESC",
            (STUDENT_ID,)
        )
        print("\nDatabase:")
        print(f"\n  Chip distribution for {STUDENT_ID}:")
        for row in cur.fetchall():
            total_tokens = row[2] or 0
            print(f"    {row[0]:20s} {row[1]:>5d} ({total_tokens:>6d} tokens)")

    # Refresh FAISS
    print("\n🔄 Refreshing FAISS index...")
    os.system("python3 tools/ingest/build_faiss_index.py")

if __name__ == "__main__":
    main()
