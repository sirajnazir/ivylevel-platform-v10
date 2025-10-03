# etl_sources_mapped.py
# ETL script for Sources with column mapping from actual CSV

import csv
import psycopg
from datetime import datetime
from typing import Dict, Optional

REQUIRED_FIELDS = ["source_id", "student_id", "source_type", "title"]

def parse_iso_datetime(date_string: Optional[str]) -> Optional[datetime]:
    """Convert ISO format string to datetime"""
    if not date_string or date_string.strip() == "":
        return None
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None

def map_source_type(source_type: str) -> str:
    """Map source types from CSV to database enum values"""
    mapping = {
        'TRANS-RAW': 'transcript',
        'IMSG-RAW': 'imessage',
        'EXEC-DOC': 'exec_doc',
        'APP-DOC': 'artifact',
        'GAMEPLAN': 'exec_doc',
        'ADMISSIONS': 'submission'
    }
    
    source_upper = source_type.upper()
    if source_upper in mapping:
        return mapping[source_upper]
    
    # Fallback mappings
    if 'TRANS' in source_upper:
        return 'transcript'
    elif 'IMSG' in source_upper or 'MESSAGE' in source_upper:
        return 'imessage'
    elif 'EXEC' in source_upper or 'DOC' in source_upper:
        return 'exec_doc'
    elif 'APP' in source_upper:
        return 'artifact'
    elif 'EMAIL' in source_upper:
        return 'email'
    elif 'SUBMIT' in source_upper or 'ADMIS' in source_upper:
        return 'submission'
    
    return 'other'

def upsert_source(cursor, row: Dict[str, str]) -> None:
    """Insert or update source record"""
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    # Map source type
    source_type = map_source_type(row['source_type'])
    
    # Parse dates
    date_start = parse_iso_datetime(row.get('date_start'))
    date_end = parse_iso_datetime(row.get('date_end'))
    
    cursor.execute(
        """
        INSERT INTO sources(
            source_id, student_id, source_type, title,
            date_start, date_end, drive_link, local_name, notes
        )
        VALUES (
            %(source_id)s, %(student_id)s, %(source_type)s, %(title)s,
            %(date_start)s, %(date_end)s, %(drive_link)s, %(local_name)s, %(notes)s
        )
        ON CONFLICT (source_id) DO UPDATE SET
            source_type = EXCLUDED.source_type,
            title = EXCLUDED.title,
            date_start = EXCLUDED.date_start,
            date_end = EXCLUDED.date_end,
            drive_link = EXCLUDED.drive_link,
            local_name = EXCLUDED.local_name,
            notes = EXCLUDED.notes;
        """,
        {
            "source_id": row["source_id"],
            "student_id": row["student_id"],
            "source_type": source_type,
            "title": row["title"],
            "date_start": date_start,
            "date_end": date_end,
            "drive_link": row.get("drive_link"),
            "local_name": row.get("local_name"),
            "notes": row.get("notes")
        }
    )

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for sources"""
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
                        upsert_source(cursor, row)
                        processed += 1
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        print(f"Error processing row {row_num}: {e}")
            
            conn.commit()
    
    print(f"\nSources ETL Summary:")
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
        print("Usage: python etl_sources_mapped.py <path_to_csv> [connection_string]")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)