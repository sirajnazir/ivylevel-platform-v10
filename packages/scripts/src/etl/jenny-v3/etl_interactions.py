# etl_interactions.py
# ETL script for Interactions table (tab 3) - Schema v1.1
# Handles coaching interactions with tactics, frameworks, and evidence links

import csv
import psycopg
from datetime import datetime
from typing import Dict, Set, Optional, List

VALID_CONFIDENCE_LEVELS = {"high", "medium", "low", None}
REQUIRED_FIELDS = ["snippet_id", "jtbd_id", "student_id", "date", "channel"]

# Caches for valid values
VALID_TACTICS: Optional[Set[str]] = None
VALID_FRAMEWORKS: Optional[Set[str]] = None

def preload_reference_data(cursor) -> tuple[Set[str], Set[str]]:
    """Load valid tactics and frameworks from database"""
    global VALID_TACTICS, VALID_FRAMEWORKS
    
    if VALID_TACTICS is None:
        cursor.execute("SELECT name FROM tactic_kinds")
        VALID_TACTICS = {row[0] for row in cursor.fetchall()}
    
    if VALID_FRAMEWORKS is None:
        cursor.execute("SELECT name FROM framework_kinds")
        VALID_FRAMEWORKS = {row[0] for row in cursor.fetchall()}
    
    return VALID_TACTICS, VALID_FRAMEWORKS

def parse_iso_datetime(date_string: str) -> datetime:
    """Convert ISO format string to datetime"""
    if not date_string or date_string.strip() == "":
        raise ValueError("Empty date string")
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid date format: {date_string}") from e

def parse_tags(tags_string: Optional[str]) -> Optional[List[str]]:
    """Parse pipe-separated tags into list"""
    if not tags_string or tags_string.strip() == "":
        return None
    return [tag.strip() for tag in tags_string.split("|") if tag.strip()]

def validate_interaction_row(row: Dict[str, str], tactics: Set[str], frameworks: Set[str]) -> None:
    """Validate interaction row data"""
    # Check required fields
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    # Validate tactic if provided
    if row.get("tactic_name") and row["tactic_name"] not in tactics:
        raise ValueError(f"Unknown tactic: {row['tactic_name']}. Valid tactics: {sorted(tactics)}")
    
    # Validate framework if provided
    if row.get("framework") and row["framework"] not in frameworks:
        raise ValueError(f"Unknown framework: {row['framework']}. Valid frameworks: {sorted(frameworks)}")
    
    # Validate confidence if provided
    conf = row.get("confidence")
    if conf and conf not in VALID_CONFIDENCE_LEVELS:
        raise ValueError(f"Invalid confidence: {conf}. Must be one of {VALID_CONFIDENCE_LEVELS}")

def upsert_interaction(cursor, row: Dict[str, str]) -> None:
    """Insert or update an interaction record"""
    # Determine if this should be excluded from tactic scoring
    excluded = row.get("channel") == "raw_transcript" or row.get("excluded_from_tactic_scoring", "false").lower() == "true"
    
    # Parse tags
    tags = parse_tags(row.get("tags"))
    
    cursor.execute(
        """
        INSERT INTO interactions(
            snippet_id, jtbd_id, student_id, occurred_at, channel, user_ask, jenny_reply,
            tactic_name, framework, tags, source_id, confidence, excluded_from_tactic_scoring
        ) VALUES (
            %(snippet_id)s, %(jtbd_id)s, %(student_id)s, %(occurred_at)s, %(channel)s, 
            %(user_ask)s, %(jenny_reply)s, %(tactic_name)s, %(framework)s, %(tags)s, 
            %(source_id)s, %(confidence)s, %(excluded)s
        ) ON CONFLICT (snippet_id) DO UPDATE SET
            jtbd_id = EXCLUDED.jtbd_id,
            student_id = EXCLUDED.student_id,
            occurred_at = EXCLUDED.occurred_at,
            channel = EXCLUDED.channel,
            user_ask = EXCLUDED.user_ask,
            jenny_reply = EXCLUDED.jenny_reply,
            tactic_name = EXCLUDED.tactic_name,
            framework = EXCLUDED.framework,
            tags = EXCLUDED.tags,
            source_id = EXCLUDED.source_id,
            confidence = EXCLUDED.confidence,
            excluded_from_tactic_scoring = EXCLUDED.excluded_from_tactic_scoring;
        """,
        {
            "snippet_id": row["snippet_id"],
            "jtbd_id": row["jtbd_id"],
            "student_id": row["student_id"],
            "occurred_at": parse_iso_datetime(row["date"]),
            "channel": row["channel"],
            "user_ask": row.get("user_ask") or None,
            "jenny_reply": row.get("jenny_reply") or None,
            "tactic_name": row.get("tactic_name") or None,
            "framework": row.get("framework") or None,
            "tags": tags,
            "source_id": row.get("source_ref") or row.get("source_id") or None,
            "confidence": row.get("confidence") or None,
            "excluded": excluded
        }
    )

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for interactions"""
    if connection_string is None:
        connection_string = "postgresql://localhost/jenny_ai"
    
    processed = 0
    errors = []
    
    with psycopg.connect(connection_string) as conn:
        with conn.cursor() as cursor:
            # Load reference data
            tactics, frameworks = preload_reference_data(cursor)
            print(f"Loaded {len(tactics)} tactics and {len(frameworks)} frameworks")
            
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, start=2):
                    try:
                        validate_interaction_row(row, tactics, frameworks)
                        upsert_interaction(cursor, row)
                        processed += 1
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        print(f"Error processing row {row_num}: {e}")
            
            conn.commit()
    
    print(f"\nInteractions ETL Summary:")
    print(f"- Processed: {processed} records")
    print(f"- Errors: {len(errors)}")
    if errors:
        print("\nError details:")
        for error in errors[:10]:
            print(f"  {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")

def generate_sample_csv():
    """Generate sample CSV for testing"""
    sample = """snippet_id,jtbd_id,student_id,date,channel,user_ask,jenny_reply,tactic_name,framework,tags,source_ref,confidence
SNP-W041-001,JTBD-W041-CAMERON-SYNTHORIA,huda-2025,2024-04-17T18:33:00Z,chat,"how to fix SAT slips?","Let's use spaced practice. Schedule 3 sessions per week focusing on your weak areas.",spaced_practice,SMART,sat|practice|slip,SRC-W044,high
SNP-W041-002,JTBD-W041-CAMERON-SYNTHORIA,huda-2025,2024-04-17T18:35:00Z,chat,"what's the schedule?","Monday: Math word problems (30min), Wednesday: Reading comprehension (45min), Friday: Grammar rules (30min)",micro_deadlines,GTD,schedule|planning,SRC-W044,high
SNP-W041-RAW-001,JTBD-W041-CAMERON-SYNTHORIA,huda-2025,2024-04-17T18:30:00Z,raw_transcript,,,[Raw VTT content],,,,SRC-W044,
SNP-W065-003,JTBD-W065-PORTFOLIO,huda-2025,2024-06-15T14:22:00Z,chat,"how to organize portfolio demos?","Create atomic slices: one demo per specific skill. Aim for 5-7 focused pieces rather than 2-3 large projects.",portfolio_slices,AtomicHabits,portfolio|organization|demos,SRC-W065,high"""
    return sample

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_interactions.py <path_to_csv> [connection_string]")
        print("\nExample CSV format:")
        print(generate_sample_csv())
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)