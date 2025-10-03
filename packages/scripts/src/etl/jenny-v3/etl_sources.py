# etl_sources.py
# ETL script for Sources table (tab 5)
# Ensures all sources have proper IDs and are registered in the system

import csv
import uuid
import psycopg
from datetime import datetime
from typing import Dict, Optional

REQUIRED_FIELDS = ["source_id", "student_id", "source_type", "title"]
VALID_SOURCE_TYPES = {"transcript", "exec_doc", "imessage", "artifact", "submission", "email", "other"}

def parse_iso_datetime(date_string: Optional[str]) -> Optional[datetime]:
    """Convert ISO format string to datetime, return None if empty or invalid"""
    if not date_string or date_string.strip() == "":
        return None
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        print(f"Warning: Invalid date format: {date_string}")
        return None

def validate_source_row(row: Dict[str, str]) -> None:
    """Validate required fields and source type"""
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    if row["source_type"] not in VALID_SOURCE_TYPES:
        raise ValueError(f"Invalid source_type: {row['source_type']}. Must be one of {VALID_SOURCE_TYPES}")

def upsert_source(cursor, row: Dict[str, str]) -> None:
    """Insert or update a source record"""
    validate_source_row(row)
    
    # Parse dates
    row["date_start"] = parse_iso_datetime(row.get("date_start"))
    row["date_end"] = parse_iso_datetime(row.get("date_end"))
    
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
            student_id = EXCLUDED.student_id,
            source_type = EXCLUDED.source_type,
            title = EXCLUDED.title,
            date_start = EXCLUDED.date_start,
            date_end = EXCLUDED.date_end,
            drive_link = EXCLUDED.drive_link,
            local_name = EXCLUDED.local_name,
            notes = EXCLUDED.notes;
        """,
        row
    )

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for sources"""
    if connection_string is None:
        # Default to environment variable or local connection
        connection_string = "postgresql://localhost/jenny_ai"
    
    processed = 0
    errors = []
    
    with psycopg.connect(connection_string) as conn:
        with conn.cursor() as cursor:
            # Ensure student exists (for testing)
            cursor.execute(
                "INSERT INTO students(student_id, full_name, grad_year) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                ("huda-2025", "Huda A.", 2025)
            )
            
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, start=2):  # Start at 2 for Excel row numbers
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
        for error in errors[:10]:  # Show first 10 errors
            print(f"  {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")

if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_sources.py <path_to_csv> [connection_string]")
        print("\nExample CSV format:")
        print("source_id,student_id,source_type,title,date_start,date_end,drive_link,local_name,notes")
        print("SRC-W044,huda-2025,transcript,W041 Transcript,2024-04-15T00:00:00Z,2024-04-17T23:59:59Z,https://drive/...,w041.vtt,SAT prep session")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)