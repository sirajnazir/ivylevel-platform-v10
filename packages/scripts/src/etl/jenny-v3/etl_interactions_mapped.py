# etl_interactions_mapped.py
# ETL script for Interactions with column mapping from actual CSV

import csv
import psycopg
from datetime import datetime
from typing import Dict, Optional

REQUIRED_FIELDS = ["snippet_id", "jtbd_id", "student_id", "date"]

def parse_datetime(date_string: str) -> datetime:
    """Parse datetime in various formats"""
    if not date_string or date_string.strip() == "":
        raise ValueError("Empty date string")
    try:
        # Handle YYYY-MM-DD HH:MM format
        if len(date_string) == 16 and date_string[4] == '-':
            return datetime.strptime(date_string, "%Y-%m-%d %H:%M")
        # Handle YYYY-MM-DD format
        if len(date_string) == 10 and date_string[4] == '-':
            return datetime.strptime(date_string, "%Y-%m-%d")
        # ISO format
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid datetime format: {date_string}") from e

def infer_channel(row: Dict[str, str]) -> str:
    """Infer channel from other fields"""
    # Check for explicit channel info
    if 'channel' in row and row['channel']:
        return row['channel'].lower()
    
    # Check source_type or other fields
    source = row.get('source_ref', '').lower()
    if 'imessage' in source or 'message' in source:
        return 'imessage'
    elif 'email' in source:
        return 'email'
    elif 'doc' in source or 'document' in source:
        return 'document'
    elif 'meeting' in source or 'session' in source:
        return 'meeting'
    
    # Default
    return 'other'

def get_confidence(row: Dict[str, str]) -> str:
    """Get confidence level with default"""
    conf = row.get('confidence', 'medium').lower()
    if conf not in {'high', 'medium', 'low'}:
        return 'medium'
    return conf

def ensure_tactic_exists(cursor, tactic_name: Optional[str]):
    """Ensure tactic kind exists"""
    if not tactic_name:
        return None
    
    cursor.execute(
        """
        INSERT INTO tactic_kinds(name, description) 
        VALUES (%s, %s) 
        ON CONFLICT (name) DO NOTHING
        """,
        (tactic_name, f"Auto-created for {tactic_name}")
    )
    return tactic_name

def ensure_framework_exists(cursor, framework: Optional[str]):
    """Ensure framework kind exists"""
    if not framework:
        return None
    
    cursor.execute(
        """
        INSERT INTO framework_kinds(name, description) 
        VALUES (%s, %s) 
        ON CONFLICT (name) DO NOTHING
        """,
        (framework, f"Auto-created for {framework}")
    )
    return framework

def insert_interaction(cursor, row: Dict[str, str]) -> None:
    """Insert an interaction record"""
    # Ensure tactic and framework exist
    tactic_name = ensure_tactic_exists(cursor, row.get('tactic') or row.get('tactic_name'))
    framework = ensure_framework_exists(cursor, row.get('framework'))
    
    # Parse tags
    tags = None
    if row.get('tags'):
        tags = [t.strip() for t in row['tags'].split(',') if t.strip()]
    
    # Get excluded flag
    excluded = row.get('excluded_from_tactic_scoring', '').lower() in ('true', '1', 'yes')
    
    # Ensure source exists
    source_ref = row.get("source_ref")
    if source_ref:
        # Check if source exists
        cursor.execute("SELECT source_id FROM sources WHERE source_id = %s", (source_ref,))
        if not cursor.fetchone():
            # Create a generic source
            cursor.execute(
                """
                INSERT INTO sources(source_id, student_id, source_type, title)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (source_id) DO NOTHING
                """,
                (source_ref, row['student_id'], 'other', source_ref)
            )
    
    cursor.execute(
        """
        INSERT INTO interactions(
            snippet_id, jtbd_id, student_id, occurred_at, channel,
            user_ask, jenny_reply, tactic_name, framework, tags,
            source_id, excluded_from_tactic_scoring
        )
        VALUES (
            %(snippet_id)s, %(jtbd_id)s, %(student_id)s, %(occurred_at)s, %(channel)s,
            %(user_ask)s, %(jenny_reply)s, %(tactic_name)s, %(framework)s, %(tags)s,
            %(source_id)s, %(excluded)s
        )
        ON CONFLICT (snippet_id) DO UPDATE SET
            occurred_at = EXCLUDED.occurred_at,
            channel = EXCLUDED.channel,
            user_ask = EXCLUDED.user_ask,
            jenny_reply = EXCLUDED.jenny_reply,
            tactic_name = EXCLUDED.tactic_name,
            framework = EXCLUDED.framework,
            tags = EXCLUDED.tags,
            source_id = EXCLUDED.source_id,
            excluded_from_tactic_scoring = EXCLUDED.excluded_from_tactic_scoring;
        """,
        {
            "snippet_id": row["snippet_id"],
            "jtbd_id": row["jtbd_id"],
            "student_id": row["student_id"],
            "occurred_at": parse_datetime(row["date"]),
            "channel": infer_channel(row),
            "user_ask": row.get("user_ask"),
            "jenny_reply": row.get("jenny_reply"),
            "tactic_name": tactic_name,
            "framework": framework,
            "tags": tags,
            "source_id": row.get("source_ref"),
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
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Check required fields
                        for field in REQUIRED_FIELDS:
                            if not row.get(field):
                                raise ValueError(f"Missing required field: {field}")
                        
                        insert_interaction(cursor, row)
                        processed += 1
                        
                        if processed % 100 == 0:
                            conn.commit()
                            print(f"  Processed {processed} interactions...")
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        if len(errors) <= 10:
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

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_interactions_mapped.py <path_to_csv> [connection_string]")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)