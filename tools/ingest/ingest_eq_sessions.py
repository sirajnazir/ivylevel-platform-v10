#!/usr/bin/env python3
"""
Universal Session-EQ Ingestion (v1.3)
Tolerant, idempotent, future-proof session intelligence ingestion.

Features:
- Field alias mapping for schema drift tolerance
- Hash-based deduplication (idempotent reruns)
- Quality gates (PII, density, confidence)
- Incremental processing (only new files)
- Comprehensive logging
"""

import json
import hashlib
import re
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import psycopg2
from psycopg2.extras import execute_values
import yaml

# Load config
CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "eq_field_aliases.yaml"
with open(CONFIG_PATH) as f:
    CONFIG = yaml.safe_load(f)

# Database connection
def get_db():
    """Get database connection from environment"""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(db_url)

# ========== FIELD EXTRACTION (Tolerant) ==========

def extract_with_aliases(data: Dict, aliases: List[str], default=None) -> Any:
    """Extract value using alias list, return default if not found"""
    # Sort aliases so dotted keys are tried first (more specific)
    sorted_aliases = sorted(aliases, key=lambda x: (0 if "." in x else 1, x))

    for alias in sorted_aliases:
        # Handle nested keys with dot notation
        if "." in alias:
            parts = alias.split(".")
            val = data
            for part in parts:
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    val = None
                    break
            if val is not None:
                return val
        elif alias in data:
            value = data[alias]
            # Never return dict/list unless it's the last option
            if isinstance(value, (dict, list)) and len(sorted_aliases) > 1:
                continue
            return value
    return default

def extract_week(data: Dict) -> Optional[str]:
    """Extract week number from various sources"""
    # Try aliases
    week = extract_with_aliases(data, CONFIG["session_meta"]["week"])
    if week:
        # Normalize to W### format
        match = re.search(r'W?(\d{2,4})', str(week), re.IGNORECASE)
        if match:
            num = match.group(1).zfill(3)
            return f"W{num}"

    # Try to extract from title/doc_id
    title = extract_with_aliases(data, CONFIG["session_meta"]["title"], "")
    match = re.search(r'W(\d{2,4})', title, re.IGNORECASE)
    if match:
        return f"W{match.group(1).zfill(3)}"

    return None

def extract_student_id(data: Dict, filename: str) -> str:
    """Infer student ID from data or filename"""
    # Try direct field
    if "student_id" in data:
        return data["student_id"]

    # Try filename patterns
    filename_lower = filename.lower()
    for pattern in CONFIG["student_id_inference"]["filename_patterns"]:
        match = re.search(pattern, filename_lower)
        if match:
            if match.groups():
                return match.group(1)
            else:
                # Pattern matched without group (e.g., "huda")
                return CONFIG["student_id_inference"]["default"]

    # Default fallback
    return CONFIG["student_id_inference"]["default"]

def normalize_speaker(speaker: str) -> str:
    """Normalize speaker name to canonical form"""
    speaker_lower = speaker.lower().strip()

    for canonical, aliases in CONFIG["speaker_normalization"].items():
        if any(alias.lower() == speaker_lower for alias in aliases):
            return canonical

    return "other"

def normalize_cue_type(cue: str) -> str:
    """Normalize cue type to canonical form"""
    cue_lower = cue.lower().strip().replace(" ", "_")

    for canonical, aliases in CONFIG["cue_type_normalization"].items():
        if cue_lower == canonical or cue_lower in aliases:
            return canonical

    return cue_lower  # Return as-is if unknown (logged later)

def normalize_confidence(conf: Any) -> float:
    """Normalize confidence to 0..1 float"""
    if conf is None:
        return 0.5

    # Already a number
    if isinstance(conf, (int, float)):
        return max(0.0, min(1.0, float(conf)))

    # String mapping
    if isinstance(conf, str):
        conf_lower = conf.lower().strip()
        return CONFIG["confidence_mapping"].get(conf_lower, 0.5)

    return 0.5

# ========== QUALITY GATES ==========

def check_pii(text: str) -> List[str]:
    """Check for PII patterns, return list of violations"""
    violations = []
    for pii_type, pattern in CONFIG["pii_patterns"].items():
        if re.search(pattern, text, re.IGNORECASE):
            violations.append(pii_type)
    return violations

def validate_quality(signals: List[Dict], utterances: List[Dict], filename: str) -> Tuple[bool, List[str]]:
    """Validate quality gates, return (pass, warnings)"""
    warnings = []

    # Density check
    min_density = CONFIG["quality_thresholds"]["min_density"]
    if len(signals) < 1 and len(utterances) < 3:
        warnings.append(f"Low density: {len(signals)} signals, {len(utterances)} utterances")
        return False, warnings

    # PII check (hard fail)
    all_text = " ".join([u.get("text", "") or "" for u in utterances])
    all_text += " ".join([s.get("evidence", "") or "" for s in signals])
    pii_violations = check_pii(all_text)
    if pii_violations:
        warnings.append(f"PII DETECTED: {', '.join(pii_violations)}")
        return False, warnings

    # Cue distribution sanity
    if signals:
        cue_counts = {}
        for sig in signals:
            cue = sig.get("cue_type", "unknown")
            cue_counts[cue] = cue_counts.get(cue, 0) + 1

        total_signals = len(signals)
        for cue, count in cue_counts.items():
            ratio = count / total_signals
            if ratio > CONFIG["quality_thresholds"]["max_single_cue_ratio"]:
                warnings.append(f"High concentration: {cue} = {ratio:.0%}")

    # Speaker balance
    if utterances:
        student_count = sum(1 for u in utterances if u.get("speaker") == "student")
        if len(utterances) > 10:
            student_ratio = student_count / len(utterances)
            if student_ratio < CONFIG["quality_thresholds"]["min_student_utterance_ratio"]:
                warnings.append(f"Low student speech: {student_ratio:.0%}")

    return True, warnings

# ========== HASH & DEDUPLICATION ==========

def compute_hash(data: Dict) -> str:
    """Compute SHA256 hash of canonicalized JSON"""
    canonical = json.dumps(data, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode()).hexdigest()

def is_already_ingested(conn, hash_sha256: str) -> bool:
    """Check if file already ingested by hash"""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM eq_signal_sets WHERE hash_sha256 = %s LIMIT 1",
            (hash_sha256,)
        )
        return cur.fetchone() is not None

# ========== EXTRACTION ==========

def extract_utterances(data: Dict) -> List[Dict]:
    """Extract utterances from various possible structures"""
    utterances = []

    # Try all possible array keys
    for array_key in CONFIG["utterances"]["array_key"]:
        arr = extract_with_aliases(data, [array_key])
        if arr and isinstance(arr, list):
            for item in arr:
                if not isinstance(item, dict):
                    continue

                # Extract fields with aliases
                speaker = extract_with_aliases(item, CONFIG["utterances"]["fields"]["speaker"])
                text = extract_with_aliases(item, CONFIG["utterances"]["fields"]["text"])

                if not speaker or not text:
                    continue

                utterances.append({
                    "speaker": normalize_speaker(speaker),
                    "text": text,
                    "timestamp": extract_with_aliases(item, CONFIG["utterances"]["fields"]["timestamp"]),
                    "turn_index": extract_with_aliases(item, CONFIG["utterances"]["fields"]["turn_index"]),
                    "move_type": extract_with_aliases(item, CONFIG["utterances"]["fields"]["move_type"]),
                    "confidence": normalize_confidence(extract_with_aliases(item, CONFIG["utterances"]["fields"]["confidence"])),
                    "cues": item.get("cues", {}),  # Preserve for per-utterance cues
                    "provenance": item.get("provenance", [])
                })
            break  # Use first matching array

    return utterances

def extract_signals_from_patterns(data: Dict) -> List[Dict]:
    """Extract signals from speech_patterns section"""
    signals = []

    # Find the patterns section
    patterns = None
    for key in CONFIG["signals"]["array_key"]:
        patterns = extract_with_aliases(data, [key])
        if patterns:
            break

    if not patterns or not isinstance(patterns, dict):
        return signals

    # Extract from counts
    counts = extract_with_aliases(patterns, CONFIG["signals"]["counts_key"], {})
    if isinstance(counts, dict):
        for cue, count in counts.items():
            if count and count > 0:
                signals.append({
                    "cue_type": normalize_cue_type(cue),
                    "evidence": None,  # Count-based, no specific evidence
                    "confidence": normalize_confidence(patterns.get("confidence", 0.9)),
                    "provenance": ["$.speech_patterns.counts"],
                    "count": count
                })

    # Extract from exemplars
    exemplars = extract_with_aliases(patterns, CONFIG["signals"]["exemplars_key"], [])
    if isinstance(exemplars, list):
        for ex in exemplars:
            if not isinstance(ex, dict):
                continue

            cue = extract_with_aliases(ex, CONFIG["signals"]["fields"]["cue_type"])
            evidence = extract_with_aliases(ex, CONFIG["signals"]["fields"]["evidence"])

            if cue:
                signals.append({
                    "cue_type": normalize_cue_type(cue),
                    "evidence": evidence,
                    "confidence": normalize_confidence(patterns.get("confidence", 0.9)),
                    "provenance": extract_with_aliases(ex, CONFIG["signals"]["fields"]["provenance"], ["$.speech_patterns.exemplars"]),
                    "count": None
                })

    return signals

def extract_signals_from_utterances(utterances: List[Dict]) -> List[Dict]:
    """Extract per-utterance cue signals"""
    signals = []

    for utt in utterances:
        cues = utt.get("cues", {})
        if not isinstance(cues, dict):
            continue

        for cue_name, cue_value in cues.items():
            # Only include if cue is explicitly true
            if cue_value is True or cue_value == 1:
                signals.append({
                    "cue_type": normalize_cue_type(cue_name),
                    "evidence": utt.get("text", "")[:200],  # First 200 chars
                    "confidence": utt.get("confidence", 0.8),
                    "provenance": utt.get("provenance", [f"$.utterance_spans[{utt.get('turn_index', '?')}]"]),
                    "count": None,
                    "utterance_ref": utt.get("turn_index")
                })

    return signals

# ========== INGESTION ==========

def ingest_session_file(conn, filepath: Path) -> Dict[str, Any]:
    """Ingest single session file, return summary"""
    result = {
        "filepath": str(filepath),
        "filename": filepath.name,
        "status": "pending",
        "signals": 0,
        "utterances": 0,
        "warnings": [],
        "error": None
    }

    try:
        # Load JSON
        with open(filepath) as f:
            data = json.load(f)

        # Compute hash
        file_hash = compute_hash(data)

        # Check if already ingested
        if is_already_ingested(conn, file_hash):
            result["status"] = "skipped"
            result["warnings"].append("Already ingested (hash match)")
            return result

        # Extract metadata
        student_id = extract_student_id(data, filepath.name)
        week = extract_week(data)
        phase = extract_with_aliases(data, CONFIG["session_meta"]["phase"])
        title = extract_with_aliases(data, CONFIG["session_meta"]["title"], filepath.stem)
        started_at = extract_with_aliases(data, CONFIG["session_meta"]["started_at"])
        ended_at = extract_with_aliases(data, CONFIG["session_meta"]["ended_at"])
        duration = extract_with_aliases(data, CONFIG["session_meta"]["duration"])
        provenance_uri = extract_with_aliases(data, CONFIG["session_meta"]["provenance_uri"], str(filepath))

        # Extract utterances
        utterances = extract_utterances(data)

        # Extract signals (from patterns + utterances)
        signals = extract_signals_from_patterns(data)
        signals += extract_signals_from_utterances(utterances)

        # Quality gates
        passed, warnings = validate_quality(signals, utterances, filepath.name)
        result["warnings"].extend(warnings)

        if not passed:
            result["status"] = "rejected"
            result["error"] = "Quality gates failed"
            return result

        # Insert signal set
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO eq_signal_sets (
                    id, source_path, student_id, phase, week, source_type, title,
                    started_at, ended_at, hash_sha256, ingested_at
                )
                VALUES (
                    gen_random_uuid(), %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, NOW()
                )
                RETURNING id
            """, (
                provenance_uri, student_id, phase, week, 'sessions', title,
                started_at, ended_at, file_hash
            ))
            set_id = cur.fetchone()[0]

        # Insert utterances
        if utterances:
            utterance_rows = []
            for utt in utterances:
                # Convert cues dict to JSONB if present
                cues_json = json.dumps(utt.get("cues", {}))
                prov_json = json.dumps(utt.get("provenance", []))

                utterance_rows.append((
                    set_id,
                    utt["speaker"],
                    utt["text"],
                    utt["move_type"],
                    cues_json,
                    prov_json
                ))

            with conn.cursor() as cur:
                execute_values(cur, """
                    INSERT INTO eq_utterances (
                        set_id, speaker, text, move_type, cues, provenance
                    )
                    VALUES %s
                """, utterance_rows, template="(%s, %s, %s, %s, %s::jsonb, %s::jsonb)")

        # Insert signals
        if signals:
            signal_rows = []
            for sig in signals:
                # Handle None provenance - convert to empty list
                prov = sig["provenance"] if sig["provenance"] else []
                if prov and not isinstance(prov, list):
                    prov = [str(prov)]

                signal_rows.append((
                    set_id,
                    sig["cue_type"],
                    sig["evidence"] or "",  # Never None
                    sig["confidence"],
                    json.dumps(prov) if prov else json.dumps([])
                ))

            with conn.cursor() as cur:
                # execute_values with ON CONFLICT for deduplication (Fix D)
                execute_values(cur, """
                    INSERT INTO eq_signals (
                        set_id, cue, exemplar, strength, provenance
                    )
                    VALUES %s
                    ON CONFLICT (set_id, cue, evidence_hash) DO NOTHING
                """, signal_rows, template="(%s, %s, %s, %s, %s::jsonb)")

        conn.commit()

        result["status"] = "success"
        result["signals"] = len(signals)
        result["utterances"] = len(utterances)

    except Exception as e:
        conn.rollback()
        result["status"] = "error"
        result["error"] = str(e)

        # Debug logging
        import traceback
        if "sequence item" in str(e) or "can't adapt" in str(e):
            print(f"  DEBUG: Full traceback:")
            traceback.print_exc()
            print(f"  DEBUG: File: {filepath.name}")
            print(f"  DEBUG: Signals count: {len(signals) if 'signals' in locals() else 'N/A'}")
            print(f"  DEBUG: Utterances count: {len(utterances) if 'utterances' in locals() else 'N/A'}")

    return result

# ========== MAIN ==========

def main():
    """Main ingestion entry point"""
    sessions_dir = Path(__file__).parent.parent.parent / "data" / "eq" / "sessions"

    if not sessions_dir.exists():
        print(f"ERROR: Sessions directory not found: {sessions_dir}")
        sys.exit(1)

    # Find all JSON files
    session_files = sorted(sessions_dir.glob("*.json"))

    if not session_files:
        print(f"No session files found in {sessions_dir}")
        sys.exit(0)

    print(f"Found {len(session_files)} session files")
    print("=" * 60)

    # Connect to DB
    conn = get_db()

    # Track results
    results = {
        "success": 0,
        "skipped": 0,
        "rejected": 0,
        "error": 0
    }

    total_signals = 0
    total_utterances = 0

    unknown_fields_log = []

    # Process each file
    for filepath in session_files:
        print(f"\nProcessing: {filepath.name}")
        result = ingest_session_file(conn, filepath)

        print(f"  Status: {result['status']}")
        if result['warnings']:
            for warn in result['warnings']:
                print(f"  ⚠️  {warn}")
        if result['error']:
            print(f"  ❌ {result['error']}")
        if result['status'] == 'success':
            print(f"  ✅ {result['signals']} signals, {result['utterances']} utterances")
            total_signals += result['signals']
            total_utterances += result['utterances']

        results[result['status']] += 1

    conn.close()

    # Summary
    print("\n" + "=" * 60)
    print("INGESTION SUMMARY")
    print("=" * 60)
    print(f"Total files: {len(session_files)}")
    print(f"  ✅ Success: {results['success']}")
    print(f"  ⏭️  Skipped: {results['skipped']}")
    print(f"  ❌ Rejected: {results['rejected']}")
    print(f"  💥 Error: {results['error']}")
    print()
    print(f"Total signals ingested: {total_signals}")
    print(f"Total utterances ingested: {total_utterances}")

    # Write summary JSON
    summary = {
        "timestamp": datetime.now().isoformat(),
        "files_processed": len(session_files),
        "results": results,
        "total_signals": total_signals,
        "total_utterances": total_utterances
    }

    summary_path = Path(__file__).parent.parent.parent / "eq_sessions_ingest_summary.json"
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    print(f"\nSummary written to: {summary_path}")

    # Exit code
    if results['error'] > 0:
        sys.exit(1)
    elif results['success'] == 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
