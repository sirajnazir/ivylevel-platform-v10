#!/usr/bin/env python3
"""
v5.4 KB Ingestion - Local JSON/INTEL → Postgres + FAISS
Production-ready with universal adapters + DOCX recovery + metadata-rich chips
"""

import os
import glob
import json
import time
import sys
import numpy as np
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from tqdm import tqdm

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from utils_json_repair import try_load_json
from adapters_intel_v54 import detect_schema_and_extract
from embed_openai import embed_texts
import faiss

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

DATA_DIRS = [
    "data/canonical/jenny-huda/01-Intelligence-GamePlan",
    "data/canonical/jenny-huda/02-Intelligence-ExecutionDocs",
    "data/canonical/jenny-huda/03-Intelligence-SessionTranscripts",
    "data/canonical/jenny-huda/04-Intelligence-iMessage",
]

FAISS_OUT = "artifacts/kb/faiss_v54.index"
FAISS_MAP = "artifacts/kb/faiss_v54_map.json"
AUDIT_CSV = "artifacts/kb/ingest_audit_v54.csv"

os.makedirs("artifacts/kb", exist_ok=True)

def upsert_doc(cur, meta, doc_id):
    """Insert or update document record."""
    # Remove NUL bytes from all string fields
    def clean_str(s):
        return s.replace('\x00', '') if isinstance(s, str) else s

    title = clean_str(meta.get("title") or os.path.basename(doc_id))
    path = clean_str(meta.get("path") or doc_id)
    meta_json = clean_str(json.dumps(meta))

    cur.execute("""
        INSERT INTO kb_docs (doc_id, student_id, source_kind, phase, week, doc_date, title, path, meta)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (doc_id) DO UPDATE SET
            student_id=EXCLUDED.student_id,
            source_kind=EXCLUDED.source_kind,
            phase=EXCLUDED.phase,
            week=EXCLUDED.week,
            doc_date=EXCLUDED.doc_date,
            title=EXCLUDED.title,
            path=EXCLUDED.path,
            meta=EXCLUDED.meta
    """, (
        doc_id,
        meta.get("student_id", "huda-2025"),
        meta.get("source_kind"),
        meta.get("phase"),
        meta.get("week"),
        meta.get("date"),
        title,
        path,
        meta_json
    ))

def upsert_chip(cur, chip, doc_id):
    """Insert chip (skip if content_hash already exists)."""
    m = chip["meta"]
    # Remove NUL bytes from chip text
    chip_text = chip["text"].replace('\x00', '') if chip.get("text") else ""

    cur.execute("""
        INSERT INTO kb_chips (
            chip_id, content_hash, doc_id, chip_type, text, tokens,
            student_id, source_kind, phase, week, chip_date,
            award, activity, framework, metrics, confidence, meta
        )
        VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (content_hash) DO NOTHING
    """, (
        chip["chip_id"],
        chip["content_hash"],
        doc_id,
        chip["chip_type"],
        chip_text,
        len(chip_text) // 4 if chip_text else 0,  # rough token estimate
        m.get("student_id"),
        m.get("source_kind"),
        m.get("phase"),
        m.get("week"),
        m.get("chip_date"),
        m.get("award"),
        m.get("activity"),
        m.get("framework"),
        m.get("metrics", []),
        m.get("confidence"),
        json.dumps(m)
    ))

def main():
    print(f"🚀 Starting v5.4 KB Intel Ingestion...")

    # Collect files
    files = []
    for d in DATA_DIRS:
        if os.path.exists(d):
            files.extend(glob.glob(os.path.join(d, "*.json")))

    print(f"📂 Found {len(files)} JSON candidates")

    all_texts, id_map = [], []
    audit_rows = []
    ok_count, fail_count = 0, 0

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            for f in tqdm(files, desc="Ingesting"):
                raw = open(f, "r", encoding="utf-8", errors="ignore").read()
                payload, err = try_load_json(raw)

                if not payload:
                    print(f"[SKIP] {f}: {err}")
                    fail_count += 1
                    audit_rows.append([f, "FAIL", str(err)[:100], 0])
                    continue

                # Build document metadata
                doc_meta = {
                    "student_id": payload.get("student_id", "huda-2025"),
                    "source_kind": payload.get("kind") or "TRANS-INTEL",
                    "phase": payload.get("phase"),
                    "week": int(payload.get("week", 0)) if str(payload.get("week", "0")).isdigit() else None,
                    "date": payload.get("date"),
                    "title": payload.get("name") or os.path.basename(f),
                    "path": payload.get("path") or f,
                }
                doc_id = payload.get("id") or payload.get("name") or os.path.relpath(f)

                try:
                    upsert_doc(cur, doc_meta, doc_id)

                    chips = detect_schema_and_extract(payload, doc_meta)
                    if not chips:
                        print(f"[WARN] No chips extracted: {f}")
                        audit_rows.append([f, "NO_CHIPS", "-", 0])
                        continue

                    for c in chips:
                        upsert_chip(cur, c, doc_id)
                        all_texts.append(c["text"])
                        id_map.append({
                            "chip_id": c["chip_id"],
                            "content_hash": c["content_hash"],
                            "chip_type": c["chip_type"]
                        })

                    ok_count += 1
                    audit_rows.append([f, "OK", "-", len(chips)])

                except Exception as e:
                    print(f"[ERROR] {f}: {e}")
                    fail_count += 1
                    audit_rows.append([f, "ERROR", str(e)[:100], 0])

        conn.commit()

    # Write audit log
    import csv
    with open(AUDIT_CSV, "w", newline="", encoding="utf-8") as af:
        w = csv.writer(af)
        w.writerow(["file", "status", "error", "chips"])
        w.writerows(audit_rows)

    print(f"\n✅ Ingestion complete:")
    print(f"  Files processed: {ok_count}/{len(files)} ({(ok_count/len(files)*100):.1f}% success)")
    print(f"  Files failed: {fail_count}")
    print(f"  Total chips: {len(all_texts)}")
    print(f"  Audit log: {AUDIT_CSV}")

    # Embeddings + FAISS
    if not all_texts:
        print("⚠️  No chips to embed. Exiting.")
        return

    print(f"\n🔢 Embedding {len(all_texts)} chips...")
    batch_size = 128
    vecs = []
    for i in range(0, len(all_texts), batch_size):
        batch_texts = all_texts[i:i+batch_size]
        v = embed_texts(batch_texts)
        vecs.append(v)
        time.sleep(0.2)  # rate limiting

    X = np.vstack(vecs).astype("float32")

    # Build FAISS index (cosine similarity via normalized dot product)
    print(f"🔍 Building FAISS index...")
    faiss.normalize_L2(X)
    index = faiss.IndexFlatIP(X.shape[1])
    index.add(X)
    faiss.write_index(index, FAISS_OUT)

    with open(FAISS_MAP, "w", encoding="utf-8") as wf:
        json.dump(id_map, wf, ensure_ascii=False, indent=2)

    print(f"\n✅ FAISS index written → {FAISS_OUT}")
    print(f"✅ ID map written → {FAISS_MAP}")

    # Query chip stats from database
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT chip_type, COUNT(*) as cnt, SUM(tokens) as total_tokens
                FROM kb_chips
                WHERE student_id=%s
                GROUP BY chip_type
                ORDER BY cnt DESC
            """, ("huda-2025",))

            print(f"\n📊 Chip distribution in database:")
            for row in cur.fetchall():
                print(f"  {row['chip_type']:20s} {row['cnt']:>5d} chips ({row['total_tokens'] or 0:>6d} tokens)")

    print(f"\n🎉 v5.4 ingestion complete!")

if __name__ == "__main__":
    main()
