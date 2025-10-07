#!/usr/bin/env python3
"""
KB Intel Ingestion from Google Drive INTEL JSONs
Ingests cleaned INTEL JSONs → Normalizes to 7 chip types → Postgres + CSV/JSONL artifacts
"""

import os
import sys
import json
import csv
import hashlib
import datetime
import re
from typing import List, Dict, Any, Optional
from googleapiclient.discovery import build
from google.oauth2 import service_account
import psycopg2
import psycopg2.extras

# ========== CONFIG ==========
DRIVE_FOLDERS = {
    "sessions": "1yVUJxMQ3oEozDkTHZVbpn7Kq3ajYGSjo",
    "execution": "1VWoESpDBVVbLe3XcGUK9f5vv2qw--p-h",
    "imessage": "12rtbM9Y_nbKQbOlSu0wR5lOWjffenaLK",
    "gameplan": "1vL4ggCrFOGqith9I73NM70srMehoF4G_"
}
STUDENT_ID = "huda-2025"
PG_URL = os.environ.get("DATABASE_URL")
GCP_CRED = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

OUT_DIR = "artifacts/kb"
OUT_CSV = f"{OUT_DIR}/derived_kb_intel.csv"
OUT_JSONL = f"{OUT_DIR}/derived_kb_intel.jsonl"

# ========== DRIVE HELPERS ==========
def drive_service():
    """Initialize Google Drive API client"""
    if not GCP_CRED or not os.path.exists(GCP_CRED):
        raise ValueError(f"GOOGLE_APPLICATION_CREDENTIALS not found at: {GCP_CRED}")
    creds = service_account.Credentials.from_service_account_file(GCP_CRED, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def list_json_files_in_folder(svc, folder_id: str) -> List[Dict[str, Any]]:
    """List all JSON files in a Drive folder (including Google Docs exported as JSON)"""
    # Accept both regular JSON files AND Google Docs (which we'll export)
    q = f"'{folder_id}' in parents and (mimeType='application/json' or mimeType='application/vnd.google-apps.document') and trashed=false"
    files = []
    page_token = None
    while True:
        resp = svc.files().list(
            q=q,
            fields="nextPageToken, files(id,name,mimeType,modifiedTime,parents)",
            pageToken=page_token
        ).execute()
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return files

def download_json(svc, file_id: str, mime_type: str) -> Dict[str, Any]:
    """Download JSON file from Drive (handles both regular JSON and Google Docs)"""
    if mime_type == 'application/vnd.google-apps.document':
        # Export Google Doc as plain text, then parse as JSON
        data = svc.files().export(fileId=file_id, mimeType='text/plain').execute()
        # Google Docs often include UTF-8 BOM, remove it
        text = data.decode("utf-8-sig")
    else:
        # Regular JSON file
        data = svc.files().get_media(fileId=file_id).execute()
        text = data.decode("utf-8")

    return json.loads(text)

# ========== HASH HELPERS ==========
def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def stable_hash(obj: Any) -> str:
    """Deterministic hash for any JSON-serializable object"""
    return sha256_bytes(json.dumps(obj, sort_keys=True).encode("utf-8"))

# ========== FILENAME PARSER ==========
def parse_filename_metadata(name: str) -> Dict[str, Optional[str]]:
    """
    Parse metadata from INTEL filename:
    2024-06-02_W047_P3-JUNIOR_TRANS-INTEL_CollegeAppFormalKickoff.json
    Returns: {dt_anchor, phase, week, doc_type}
    """
    result = {"dt_anchor": None, "phase": None, "week": None, "doc_type": None}

    # Date (YYYY-MM-DD)
    date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', name)
    if date_match:
        try:
            result["dt_anchor"] = datetime.datetime.fromisoformat(date_match.group(1))
        except ValueError:
            pass

    # Week (W047)
    week_match = re.search(r'W(\d{3})', name)
    if week_match:
        result["week"] = week_match.group(1)

    # Phase (P1-P5)
    phase_match = re.search(r'P([1-5])', name)
    if phase_match:
        result["phase"] = f"P{phase_match.group(1)}"

    # Doc type (TRANS, EXEC, etc.)
    if "TRANS" in name.upper():
        result["doc_type"] = "session_transcript"
    elif "EXEC" in name.upper():
        result["doc_type"] = "execution_doc"
    elif "IMESSAGE" in name.upper():
        result["doc_type"] = "imessage"
    elif "GAMEPLAN" in name.upper():
        result["doc_type"] = "gameplan"

    return result

# ========== CHIP EXTRACTOR ==========
def _norm_list(x):
    """Normalize to list"""
    if x is None:
        return []
    if isinstance(x, list):
        return x
    return [x]

def _maybe_ts(s):
    """Parse timestamp if possible"""
    if not s:
        return None
    try:
        return datetime.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except Exception:
        return None

def _harvest_links(container) -> List[Dict[str, str]]:
    """
    Extract links to awards/programs/ECs/apps from chip content
    Returns: [{"link_type": "award", "link_key": "NCWIT"}, ...]
    """
    links = []
    if not container:
        return links

    # Explicit structured links
    for item in _norm_list(container.get("links")):
        if isinstance(item, dict) and "type" in item and "key" in item:
            links.append({"link_type": str(item["type"]).lower(), "link_key": str(item["key"])})

    # Heuristic extraction from common fields
    for k in ("artifact", "award_name", "program_name", "application"):
        v = container.get(k)
        if v:
            lt = "award" if "award" in k or ("ncwit" in str(v).lower()) else (
                 "program" if "program" in k else (
                 "application" if "application" in k else "artifact"))
            links.append({"link_type": lt, "link_key": str(v)})

    return links

def extract_chips(domain: str, payload: Dict[str, Any], student_id: str, doc_id: str) -> tuple:
    """
    Map rich INTEL schema → seven chip families
    Returns: (chips: List[dict], chip_links: List[dict])
    """
    chips = []
    all_chip_links = []

    # Common metadata
    meta = payload.get("session_metadata") or payload.get("meta") or {}
    global_tags = _norm_list(payload.get("tags") or meta.get("tags"))
    global_started = _maybe_ts(meta.get("date") or meta.get("started_at") or meta.get("datetime"))
    global_ended = _maybe_ts(meta.get("ended_at"))

    # Main intelligence layers container
    layers = payload.get("intelligence_layers_extracted") or {}

    # 1. JTBD (problems, asks, desired outcomes)
    for layer_key in ["1_diagnostic_intelligence", "jtbd_layer", "session_jtbd"]:
        layer_data = layers.get(layer_key) or {}
        if isinstance(layer_data, dict):
            for jtbd_name, jtbd_data in layer_data.items():
                if isinstance(jtbd_data, dict):
                    chips.append({
                        "chip_type": "jtbd",
                        "content_json": {
                            "name": jtbd_name,
                            "issue": jtbd_data.get("issue"),
                            "blocking_issue": jtbd_data.get("blocking_issue"),
                            "desired_outcome": jtbd_data.get("desired_outcome"),
                            "deadline": jtbd_data.get("deadline"),
                            "timestamp": jtbd_data.get("timestamp"),
                            "source": layer_key
                        },
                        "title": jtbd_name.replace("_", " ").title(),
                        "summary": jtbd_data.get("issue") or jtbd_data.get("blocking_issue"),
                        "tags": global_tags,
                        "started_at": global_started,
                        "ended_at": global_ended
                    })

    # 2. Tactics (from multiple sources)
    # 2a. Strategic intelligence layer
    strategic = layers.get("2_strategic_intelligence") or {}
    for tactic_name, tactic_data in strategic.items():
        if isinstance(tactic_data, dict):
            chips.append({
                "chip_type": "tactic",
                "content_json": {
                    "name": tactic_name,
                    **tactic_data,
                    "source": "strategic_intelligence"
                },
                "title": tactic_name.replace("_", " ").title(),
                "summary": tactic_data.get("purpose") or tactic_data.get("psychology"),
                "tags": list(set(global_tags + _norm_list(tactic_data.get("tags")))),
                "started_at": _maybe_ts(tactic_data.get("timestamp")) or global_started,
                "ended_at": global_ended
            })

    # 2b. Tactical intelligence layer
    tactical = layers.get("3_tactical_intelligence") or {}
    for tactic_name, tactic_data in tactical.items():
        if isinstance(tactic_data, dict):
            chips.append({
                "chip_type": "tactic",
                "content_json": {
                    "name": tactic_name,
                    **tactic_data,
                    "source": "tactical_intelligence"
                },
                "title": tactic_name.replace("_", " ").title(),
                "summary": tactic_data.get("purpose") or tactic_data.get("assignment"),
                "tags": list(set(global_tags + _norm_list(tactic_data.get("tags")))),
                "started_at": _maybe_ts(tactic_data.get("timestamp")) or global_started,
                "ended_at": global_ended
            })

    # 2c. Hidden techniques discovered
    hidden = payload.get("hidden_techniques_discovered") or {}
    for tech_name, tech_data in hidden.items():
        if isinstance(tech_data, dict):
            chips.append({
                "chip_type": "tactic",
                "content_json": {
                    "name": tech_name,
                    "description": tech_data.get("description"),
                    "timing": tech_data.get("timing"),
                    "purpose": tech_data.get("purpose"),
                    "benefit": tech_data.get("benefit"),
                    "execution": tech_data.get("execution"),
                    "source": "hidden_techniques"
                },
                "title": tech_name.replace("_", " ").title(),
                "summary": tech_data.get("description"),
                "tags": global_tags,
                "started_at": global_started,
                "ended_at": global_ended
            })

    # 3. Frameworks
    # Look in multiple layers
    for layer_key in ["frameworks_used", "frameworks", "strategic_insights"]:
        fw_data = layers.get(layer_key) or payload.get(layer_key) or {}
        if isinstance(fw_data, dict):
            for fw_name, fw_content in fw_data.items():
                if isinstance(fw_content, (dict, str)):
                    chips.append({
                        "chip_type": "framework",
                        "content_json": {
                            "name": fw_name,
                            "content": fw_content if isinstance(fw_content, str) else fw_content,
                            "source": layer_key
                        },
                        "title": fw_name.replace("_", " ").title(),
                        "summary": fw_content if isinstance(fw_content, str) else fw_content.get("description"),
                        "tags": global_tags,
                        "started_at": global_started,
                        "ended_at": global_ended
                    })

    # 4. Micro-moments
    # 4a. Relationship intelligence
    relationship = layers.get("4_relationship_intelligence") or {}
    for moment_name, moment_data in relationship.items():
        if isinstance(moment_data, dict):
            chips.append({
                "chip_type": "micro_moment",
                "content_json": {
                    "name": moment_name,
                    **moment_data,
                    "source": "relationship_intelligence"
                },
                "title": moment_name.replace("_", " ").title(),
                "summary": moment_data.get("jenny_insight") or moment_data.get("discovery"),
                "tags": global_tags,
                "started_at": _maybe_ts(moment_data.get("timestamp")) or global_started,
                "ended_at": global_ended
            })

    # 4b. Hyper-relatability intelligence
    hyper = layers.get("9_hyper_relatability_intelligence") or {}
    for moment_name, moment_data in hyper.items():
        if isinstance(moment_data, dict):
            chips.append({
                "chip_type": "micro_moment",
                "content_json": {
                    "name": moment_name,
                    **moment_data,
                    "source": "hyper_relatability"
                },
                "title": moment_name.replace("_", " ").title(),
                "summary": moment_data.get("jenny_validation") or moment_data.get("empathy"),
                "tags": global_tags,
                "started_at": _maybe_ts(moment_data.get("timestamp")) or global_started,
                "ended_at": global_ended
            })

    # 5. Reflections/Insights
    # 5a. Adaptive intelligence
    adaptive = layers.get("5_adaptive_intelligence") or {}
    for insight_name, insight_data in adaptive.items():
        if isinstance(insight_data, dict):
            chips.append({
                "chip_type": "reflection",
                "content_json": {
                    "name": insight_name,
                    **insight_data,
                    "source": "adaptive_intelligence"
                },
                "title": insight_name.replace("_", " ").title(),
                "summary": insight_data.get("problem") or insight_data.get("solution"),
                "tags": global_tags,
                "started_at": _maybe_ts(insight_data.get("timestamp")) or global_started,
                "ended_at": global_ended
            })

    # 5b. Strategic insights
    insights = payload.get("strategic_insights") or {}
    for insight_name, insight_text in insights.items():
        if isinstance(insight_text, str):
            chips.append({
                "chip_type": "reflection",
                "content_json": {
                    "name": insight_name,
                    "insight": insight_text,
                    "source": "strategic_insights"
                },
                "title": insight_name.replace("_", " ").title(),
                "summary": insight_text,
                "tags": global_tags,
                "started_at": global_started,
                "ended_at": global_ended
            })

    # 6. Success paths
    # 6a. Outcome intelligence
    outcomes = layers.get("7_outcome_intelligence") or {}
    for outcome_name, outcome_data in outcomes.items():
        if isinstance(outcome_data, dict):
            chips.append({
                "chip_type": "success_path",
                "content_json": {
                    "name": outcome_name,
                    **outcome_data,
                    "source": "outcome_intelligence"
                },
                "title": outcome_name.replace("_", " ").title(),
                "summary": str(outcome_data),
                "tags": global_tags,
                "started_at": global_started,
                "ended_at": global_ended
            })

    # 7. Style
    speech = payload.get("jenny_speech_patterns") or []
    if speech:
        chips.append({
            "chip_type": "style",
            "content_json": {
                "speech_patterns": speech,
                "source": "jenny_speech_patterns"
            },
            "title": "Jenny Speech Patterns",
            "summary": f"{len(speech)} signature phrases",
            "tags": global_tags,
            "started_at": global_started,
            "ended_at": global_ended
        })

    # Fallback: simple flat keys (backward compatibility)
    if not chips:
        flat_map = {
            "jtbd": "jtbd",
            "tactics": "tactic",
            "frameworks": "framework",
            "micro_moments": "micro_moment",
            "moments": "micro_moment",
            "insights": "reflection",
            "success_paths": "success_path",
            "style": "style"
        }
        for key, chip_type in flat_map.items():
            for item in _norm_list(payload.get(key)):
                if isinstance(item, dict):
                    chips.append({
                        "chip_type": chip_type,
                        "content_json": item,
                        "title": item.get("title") or item.get("name"),
                        "summary": item.get("summary"),
                        "tags": global_tags,
                        "started_at": global_started,
                        "ended_at": global_ended
                    })

    # Extract links for all chips
    for chip in chips:
        links = _harvest_links(chip.get("content_json", {}))
        for link in links:
            all_chip_links.append({
                **link,
                "chip_id": None  # Will be filled in after chip_id is generated
            })

    # Debug logging
    if not chips:
        print(f"[warn] No chips extracted from {doc_id} (domain={domain}). Top keys: {list(payload.keys())[:10]}", file=sys.stderr)

    return chips, all_chip_links

def extract_chip_metadata(chip_type: str, content: Dict[str, Any]) -> Dict[str, Any]:
    """Extract title, summary, tags, temporal anchors from chip content"""
    meta = {
        "title": None,
        "summary": None,
        "tags": [],
        "started_at": None,
        "ended_at": None
    }

    # Title (common keys)
    for key in ["title", "name", "artifact", "framework_name", "theme"]:
        if key in content:
            meta["title"] = str(content[key])
            break

    # Summary (common keys)
    for key in ["summary", "rationale", "insight", "goal", "desired_outcome"]:
        if key in content:
            meta["summary"] = str(content[key])
            break

    # Tags
    if "tags" in content and isinstance(content["tags"], list):
        meta["tags"] = [str(t) for t in content["tags"]]

    # Temporal anchors
    for key in ["started_at", "date", "timestamp"]:
        if key in content:
            try:
                meta["started_at"] = datetime.datetime.fromisoformat(str(content[key]))
            except (ValueError, TypeError):
                pass

    for key in ["ended_at", "deadline"]:
        if key in content:
            try:
                meta["ended_at"] = datetime.datetime.fromisoformat(str(content[key]))
            except (ValueError, TypeError):
                pass

    return meta

def estimate_tokens(content: Dict[str, Any]) -> int:
    """Rough token estimate (4 chars ≈ 1 token)"""
    text = json.dumps(content)
    return len(text) // 4

# ========== DATABASE ==========
def upsert_doc(cur, doc: Dict[str, Any]):
    """Insert or ignore kb_docs record"""
    cur.execute("""
        INSERT INTO kb_docs (
            doc_id, source_system, drive_file_id, drive_path, filename, mime_type,
            student_id, phase, domain, dt_anchor, sha256, meta_json
        )
        VALUES (
            %(doc_id)s, %(source_system)s, %(drive_file_id)s, %(drive_path)s,
            %(filename)s, %(mime_type)s, %(student_id)s, %(phase)s, %(domain)s,
            %(dt_anchor)s, %(sha256)s, %(meta_json)s
        )
        ON CONFLICT (doc_id) DO UPDATE SET
            filename = EXCLUDED.filename,
            meta_json = EXCLUDED.meta_json
    """, doc)

def upsert_chip(cur, chip: Dict[str, Any]):
    """Insert or update kb_chips record"""
    cur.execute("""
        INSERT INTO kb_chips (
            chip_id, doc_id, student_id, chip_type, title, summary,
            content_json, tokens_est, started_at, ended_at, tags
        )
        VALUES (
            %(chip_id)s, %(doc_id)s, %(student_id)s, %(chip_type)s,
            %(title)s, %(summary)s, %(content_json)s, %(tokens_est)s,
            %(started_at)s, %(ended_at)s, %(tags)s
        )
        ON CONFLICT (chip_id) DO UPDATE SET
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            content_json = EXCLUDED.content_json,
            tags = EXCLUDED.tags,
            tokens_est = EXCLUDED.tokens_est
    """, chip)

# ========== MAIN INGESTION ==========
def main():
    """Main ingestion pipeline"""
    print("🚀 Starting KB Intel Ingestion from Google Drive...")

    # Validate environment
    if not PG_URL:
        print("❌ ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    if not GCP_CRED:
        print("❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS not set", file=sys.stderr)
        sys.exit(1)

    # Ensure output directory
    os.makedirs(OUT_DIR, exist_ok=True)

    # Initialize services
    print("📡 Connecting to Google Drive...")
    svc = drive_service()

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
        for domain, folder_id in DRIVE_FOLDERS.items():
            print(f"\n📂 Processing folder: {domain} ({folder_id})")

            files = list_json_files_in_folder(svc, folder_id)
            print(f"   Found {len(files)} JSON files")

            for file_meta in files:
                stats["files_scanned"] += 1
                filename = file_meta["name"]

                # Only process INTEL files
                if "INTEL" not in filename.upper():
                    print(f"   ⏭️  SKIP (not INTEL): {filename}")
                    continue

                try:
                    print(f"   📥 {filename}")

                    # Download JSON
                    payload = download_json(svc, file_meta["id"], file_meta.get("mimeType"))
                    raw_hash = stable_hash(payload)

                    # Parse filename metadata
                    file_meta_parsed = parse_filename_metadata(filename)

                    # Create doc record
                    doc_id = f"{domain}:{file_meta['id']}:{raw_hash[:12]}"
                    doc = {
                        "doc_id": doc_id,
                        "source_system": "gdrive",
                        "drive_file_id": file_meta["id"],
                        "drive_path": domain,
                        "filename": filename,
                        "mime_type": file_meta.get("mimeType"),
                        "student_id": STUDENT_ID,
                        "phase": file_meta_parsed["phase"],
                        "domain": domain,
                        "dt_anchor": file_meta_parsed["dt_anchor"],
                        "sha256": raw_hash,
                        "meta_json": json.dumps({
                            "modified_time": file_meta.get("modifiedTime"),
                            "week": file_meta_parsed["week"],
                            "doc_type": file_meta_parsed["doc_type"]
                        })
                    }
                    upsert_doc(cur, doc)

                    # Extract chips
                    chips = extract_chips(domain, payload)
                    print(f"      → {len(chips)} chips extracted")

                    for chip_raw in chips:
                        chip_type = chip_raw["chip_type"]
                        content = chip_raw["content_json"]

                        # Extract metadata
                        meta = extract_chip_metadata(chip_type, content)

                        # Generate deterministic chip_id
                        chip_id = stable_hash({
                            "doc_id": doc_id,
                            "chip_type": chip_type,
                            "content": content
                        })

                        # Prepare chip record
                        chip = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": meta["title"],
                            "summary": meta["summary"],
                            "content_json": json.dumps(content),
                            "tokens_est": estimate_tokens(content),
                            "started_at": meta["started_at"],
                            "ended_at": meta["ended_at"],
                            "tags": meta["tags"]
                        }
                        upsert_chip(cur, chip)
                        stats["chips_created"] += 1

                        # Write JSONL artifact
                        jsonl_record = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": meta["title"] or "",
                            "summary": meta["summary"] or "",
                            "tags": meta["tags"],
                            "domain": domain,
                            "filename": filename,
                            "content_json": content
                        }
                        jsonl_file.write(json.dumps(jsonl_record, ensure_ascii=False) + "\n")

                        # CSV row (flattened for easy inspection)
                        csv_row = {
                            "chip_id": chip_id,
                            "doc_id": doc_id,
                            "student_id": STUDENT_ID,
                            "chip_type": chip_type,
                            "title": meta["title"] or "",
                            "summary": (meta["summary"] or "")[:200],  # truncate
                            "tags": "|".join(meta["tags"]),
                            "domain": domain,
                            "filename": filename,
                            "tokens_est": chip["tokens_est"]
                        }
                        all_csv_rows.append(csv_row)

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
    print("✅ KB INTEL INGESTION COMPLETE")
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
