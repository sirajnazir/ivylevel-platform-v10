#!/usr/bin/env python3
"""
KB Intel Ingestion from LOCAL files (v2 - Segments Reconstruction)
Reconstructs JSON from segments array to bypass malformed text field
"""

import os
import sys
import json
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
OUT_JSONL = f"{OUT_DIR}/derived_kb_intel.jsonl"

# Import helpers
sys.path.insert(0, os.path.dirname(__file__))
from ingest_drive_intel import (
    stable_hash, parse_filename_metadata,
    estimate_tokens, upsert_doc, upsert_chip
)

def fix_json_syntax(text: str) -> str:
    """
    Fix common JSON syntax errors from LLM-generated output:
    - `"key": ,` → `"key": null,`
    - `"key": }` → `"key": null }`
    - `"key": ]` → `"key": null ]`
    - Trailing commas before } or ]
    """
    import re

    # Fix empty values: "key": , → "key": null,
    text = re.sub(r':\s*,', ': null,', text)

    # Fix empty values before closing: "key": } → "key": null }
    text = re.sub(r':\s*}', ': null }', text)
    text = re.sub(r':\s*]', ': null ]', text)

    # Fix trailing commas before closing brace/bracket
    text = re.sub(r',\s*}', ' }', text)
    text = re.sub(r',\s*]', ' ]', text)

    return text

def reconstruct_json(wrapped: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Try multiple strategies to extract valid JSON:
    1. Use 'text' field directly if valid
    2. Fix common JSON syntax errors and retry
    3. Join segments array if text is malformed
    4. Fix segments and retry
    5. Return None if all fail
    """
    # Strategy 1: Try text field first
    if 'text' in wrapped and isinstance(wrapped['text'], str):
        try:
            return json.loads(wrapped['text'])
        except json.JSONDecodeError:
            # Strategy 2: Try fixing syntax errors
            try:
                fixed_text = fix_json_syntax(wrapped['text'])
                return json.loads(fixed_text)
            except json.JSONDecodeError:
                pass  # Try next strategy

    # Strategy 3: Join segments
    if 'segments' in wrapped and isinstance(wrapped['segments'], list):
        try:
            full_text = "".join(wrapped['segments'])
            return json.loads(full_text)
        except json.JSONDecodeError:
            # Strategy 4: Fix joined segments
            try:
                fixed_text = fix_json_syntax(full_text)
                return json.loads(fixed_text)
            except json.JSONDecodeError:
                pass

    return None

def extract_chips_flexible(domain: str, payload: Dict[str, Any], student_id: str, doc_id: str) -> tuple:
    """
    Flexible chip extraction that works with ANY INTEL schema
    Strategy: Extract frameworks/tactics/insights from any top-level structure
    """
    chips = []
    chip_links = []

    # Get metadata
    meta = payload.get("session_metadata") or payload.get("meta_discovery") or payload.get("meta") or {}
    global_started = None
    if "date" in meta or "started_at" in meta:
        date_str = str(meta.get("date") or meta.get("started_at"))
        try:
            global_started = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except:
            pass

    # EXECUTION DOCS: Extract frameworks from top-level keys like JENNY'S_15_OUTCOME-DRIVEN_FRAMEWORKS
    if domain == "execution":
        for key, value in payload.items():
            if not isinstance(value, dict):
                continue

            # Skip metadata keys
            if key in ["meta", "meta_discovery", "session_metadata"]:
                continue

            # Each top-level dict is likely a framework or tactic collection
            if "_FRAMEWORK" in key or "STRATEGY" in key or "SYSTEM" in key or "METHOD" in key:
                # This is a framework container
                for framework_name, framework_data in value.items():
                    if isinstance(framework_data, dict):
                        chips.append({
                            "chip_type": "framework",
                            "content_json": framework_data,
                            "title": framework_name.replace("_", " ").title(),
                            "summary": framework_data.get("framework") or framework_data.get("principle") or framework_data.get("philosophy") or str(framework_data)[:200],
                            "tags": [],
                            "started_at": global_started,
                            "ended_at": None
                        })

            # Extract tactics from sections
            elif "TACTIC" in key or "TECHNIQUE" in key:
                for tactic_name, tactic_data in value.items():
                    if isinstance(tactic_data, dict):
                        chips.append({
                            "chip_type": "tactic",
                            "content_json": tactic_data,
                            "title": tactic_name.replace("_", " ").title(),
                            "summary": str(tactic_data)[:200],
                            "tags": [],
                            "started_at": global_started,
                            "ended_at": None
                        })

    # SESSION TRANSCRIPTS: Extract from intelligence_layers_extracted
    elif domain == "sessions":
        layers = payload.get("intelligence_layers_extracted") or {}

        # Extract JTBD
        for layer_key in ["1_diagnostic_intelligence", "jtbd_layer", "session_jtbd"]:
            layer_data = layers.get(layer_key) or {}
            if isinstance(layer_data, dict):
                for jtbd_name, jtbd_data in layer_data.items():
                    if isinstance(jtbd_data, dict):
                        chips.append({
                            "chip_type": "jtbd",
                            "content_json": jtbd_data,
                            "title": jtbd_name.replace("_", " ").title(),
                            "summary": jtbd_data.get("issue") or str(jtbd_data)[:200],
                            "tags": [],
                            "started_at": global_started,
                            "ended_at": None
                        })

        # Extract tactics
        for layer_key in ["2_strategic_intelligence", "3_tactical_intelligence"]:
            layer_data = layers.get(layer_key) or {}
            if isinstance(layer_data, dict):
                for tactic_name, tactic_data in layer_data.items():
                    if isinstance(tactic_data, dict):
                        chips.append({
                            "chip_type": "tactic",
                            "content_json": tactic_data,
                            "title": tactic_name.replace("_", " ").title(),
                            "summary": str(tactic_data)[:200],
                            "tags": [],
                            "started_at": global_started,
                            "ended_at": None
                        })

        # Extract micro-moments
        for layer_key in ["4_relationship_intelligence", "9_hyper_relatability_intelligence"]:
            layer_data = layers.get(layer_key) or {}
            if isinstance(layer_data, dict):
                for moment_name, moment_data in layer_data.items():
                    if isinstance(moment_data, dict):
                        chips.append({
                            "chip_type": "micro_moment",
                            "content_json": moment_data,
                            "title": moment_name.replace("_", " ").title(),
                            "summary": str(moment_data)[:200],
                            "tags": [],
                            "started_at": global_started,
                            "ended_at": None
                        })

    return chips, chip_links

def main():
    """Main ingestion pipeline for local files (v2)"""
    print("🚀 Starting KB Intel Ingestion from LOCAL files (v2 - Segment Reconstruction)...")

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
        "files_parsed": 0,
        "chips_created": 0,
        "errors": 0
    }

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
                    continue

                try:
                    # Load wrapped JSON
                    with open(json_path, 'r', encoding='utf-8') as f:
                        wrapped = json.load(f)

                    # Reconstruct INTEL payload
                    payload = reconstruct_json(wrapped)
                    if payload is None:
                        print(f"   ❌ SKIP: Could not reconstruct JSON from {filename}")
                        stats["errors"] += 1
                        continue

                    stats["files_parsed"] += 1
                    raw_hash = stable_hash(payload)

                    # Parse filename metadata
                    file_meta_parsed = parse_filename_metadata(filename)

                    # Create doc record
                    doc_id = f"{domain}:{raw_hash[:12]}"
                    doc = {
                        "doc_id": doc_id,
                        "source_system": "local",
                        "drive_file_id": json_path,
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

                    # Extract chips (flexible)
                    chips, chip_links = extract_chips_flexible(domain, payload, STUDENT_ID, doc_id)

                    if len(chips) > 0:
                        print(f"   📥 {filename} → {len(chips)} chips")
                    else:
                        print(f"   ⚠️  {filename} → 0 chips")

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

                except Exception as e:
                    print(f"      ❌ ERROR: {e}", file=sys.stderr)
                    stats["errors"] += 1
                    continue

    # Final summary
    print("\n" + "="*60)
    print("✅ KB INTEL INGESTION COMPLETE (LOCAL v2)")
    print("="*60)
    print(f"Files scanned:   {stats['files_scanned']}")
    print(f"Files parsed:    {stats['files_parsed']}")
    print(f"Chips created:   {stats['chips_created']}")
    print(f"Errors:          {stats['errors']}")
    print(f"\nArtifacts:")
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
