#!/usr/bin/env python3
"""
KB Intel Ingestion from LOCAL files (canonical data)
Faster and more reliable than Drive API for existing processed files
"""

import os
import sys
import json
import csv
import hashlib
import datetime
import glob
from typing import List, Dict, Any, Optional
import psycopg2
import psycopg2.extras

# ========== CONFIG ==========
LOCAL_DATA_ROOT = "data/canonical/jenny-huda"
LOCAL_FOLDERS = {
    "sessions": "03-Intelligence-SessionTranscripts",
    "execution": "02-Intelligence-ExecutionDocs",
    "imessage": "04-Intelligence-iMessage",
    "gameplan": "01-Intelligence-GamePlan"
}
STUDENT_ID = "huda-2025"
PG_URL = os.environ.get("DATABASE_URL")

OUT_DIR = "artifacts/kb"
OUT_CSV = f"{OUT_DIR}/derived_kb_intel.csv"
OUT_JSONL = f"{OUT_DIR}/derived_kb_intel.jsonl"

# Import all the helpers from the original script
sys.path.insert(0, os.path.dirname(__file__))
from ingest_drive_intel import (
    sha256_bytes, stable_hash, parse_filename_metadata,
    extract_chips, extract_chip_metadata, estimate_tokens,
    upsert_doc, upsert_chip
)

def main():
    """Main ingestion pipeline for local files"""
    print("🚀 Starting KB Intel Ingestion from LOCAL files...")

    # Validate environment
    if not PG_URL:
        print("❌ ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    # Ensure output directory
    os.makedirs(OUT_DIR, exist_ok=True)

    # Initialize PostgreSQL
    print("🐘 Connecting to PostgreSQL...")
    conn = psycopg2.connect(PG_URL)
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Stats
    stats = {
        "files_scanned": 0,
        "files_ingested": 0,
        "chips_created": 0,
        "errors": 0
    }

    all_csv_rows = []

    with open(OUT_JSONL, "w", encoding="utf-8") as jsonl_file:
        for domain, folder_name in LOCAL_FOLDERS.items():
            folder_path = os.path.join(LOCAL_DATA_ROOT, folder_name)
            if not os.path.exists(folder_path):
                print(f"⚠️  SKIP: Folder not found: {folder_path}")
                continue

            print(f"\n📂 Processing folder: {domain} ({folder_path})")

            # Find all JSON files
            json_files = glob.glob(os.path.join(folder_path, "*.json"))
            print(f"   Found {len(json_files)} JSON files")

            for json_path in json_files:
                stats["files_scanned"] += 1
                filename = os.path.basename(json_path)

                # Only process INTEL files
                if "INTEL" not in filename.upper():
                    print(f"   ⏭️  SKIP (not INTEL): {filename}")
                    continue

                try:
                    print(f"   📥 {filename}")

                    # Load the wrapped JSON
                    with open(json_path, 'r', encoding='utf-8') as f:
                        wrapped = json.load(f)

                    # Extract the actual INTEL JSON from the 'text' field
                    if 'text' in wrapped and isinstance(wrapped['text'], str):
                        intel_text = wrapped['text']
                        payload = json.loads(intel_text)
                    else:
                        # Fallback: file might already be unwrapped
                        payload = wrapped

                    raw_hash = stable_hash(payload)

                    # Parse filename metadata
                    file_meta_parsed = parse_filename_metadata(filename)

                    # Create doc record
                    doc_id = f"{domain}:{raw_hash[:12]}"
                    doc = {
                        "doc_id": doc_id,
                        "source_system": "local",
                        "drive_file_id": json_path,  # use path as ID
                        "drive_path": domain,
                        "filename": filename,
                        "mime_type": "application/json",
                        "student_id": STUDENT_ID,
                        "phase": file_meta_parsed["phase"],
                        "domain": domain,
                        "dt_anchor": file_meta_parsed["dt_anchor"],
                        "sha256": raw_hash,
                        "meta_json": json.dumps({
                            "week": file_meta_parsed["week"],
                            "doc_type": file_meta_parsed["doc_type"],
                            "local_path": json_path
                        })
                    }
                    upsert_doc(cur, doc)

                    # Extract chips
                    chips, chip_links = extract_chips(domain, payload, STUDENT_ID, doc_id)
                    print(f"      → {len(chips)} chips extracted")

                    for chip_raw in chips:
                        chip_type = chip_raw["chip_type"]
                        content_json = chip_raw["content_json"]

                        # Generate deterministic chip_id
                        chip_id = stable_hash({
                            "doc_id": doc_id,
                            "chip_type": chip_type,
                            "content": content_json
                        })

                        # Prepare chip record
                        chip = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": chip_raw.get("title"),
                            "summary": chip_raw.get("summary"),
                            "content_json": json.dumps(content_json) if isinstance(content_json, dict) else content_json,
                            "tokens_est": estimate_tokens(content_json) if isinstance(content_json, dict) else len(str(content_json))//4,
                            "started_at": chip_raw.get("started_at"),
                            "ended_at": chip_raw.get("ended_at"),
                            "tags": chip_raw.get("tags") or []
                        }
                        upsert_chip(cur, chip)
                        stats["chips_created"] += 1

                        # Write JSONL artifact
                        jsonl_record = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": chip_raw.get("title") or "",
                            "summary": chip_raw.get("summary") or "",
                            "tags": chip_raw.get("tags") or [],
                            "domain": domain,
                            "filename": filename,
                            "content_json": content_json
                        }
                        jsonl_file.write(json.dumps(jsonl_record, ensure_ascii=False) + "\n")

                        # CSV row
                        csv_row = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": chip_raw.get("title") or "",
                            "summary": (chip_raw.get("summary") or "")[:200],
                            "tags": "|".join(chip_raw.get("tags") or []),
                            "domain": domain,
                            "filename": filename,
                            "tokens_est": chip["tokens_est"]
                        }
                        all_csv_rows.append(csv_row)

                        # Insert chip links
                        for link in chip_links:
                            if link["chip_id"] is None:
                                link["chip_id"] = chip_id
                            try:
                                cur.execute("""
                                    INSERT INTO kb_chip_links (chip_id, link_type, link_key)
                                    VALUES (%s, %s, %s)
                                    ON CONFLICT DO NOTHING
                                """, (link["chip_id"], link["link_type"], link["link_key"]))
                            except Exception as link_err:
                                # Skip link errors
                                pass

                    stats["files_ingested"] += 1

                except Exception as e:
                    print(f"      ❌ ERROR: {e}", file=sys.stderr)
                    stats["errors"] += 1
                    continue

    # Write CSV artifact
    if all_csv_rows:
        with open(OUT_CSV, "w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=list(all_csv_rows[0].keys()))
            writer.writeheader()
            writer.writerows(all_csv_rows)

    # Final summary
    print("\n" + "="*60)
    print("✅ KB INTEL INGESTION COMPLETE (LOCAL)")
    print("="*60)
    print(f"Files scanned:   {stats['files_scanned']}")
    print(f"Files ingested:  {stats['files_ingested']}")
    print(f"Chips created:   {stats['chips_created']}")
    print(f"Errors:          {stats['errors']}")
    print(f"\nArtifacts:")
    print(f"  📄 CSV:   {OUT_CSV}")
    print(f"  📄 JSONL: {OUT_JSONL}")
    print("\nDatabase:")

    # Query stats
    cur.execute("SELECT chip_type, COUNT(*) as cnt FROM kb_chips WHERE student_id=%s GROUP BY chip_type ORDER BY cnt DESC", (STUDENT_ID,))
    print(f"\n  Chip distribution for {STUDENT_ID}:")
    for row in cur.fetchall():
        print(f"    {row['chip_type']:20s} {row['cnt']:>5d}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
