# etl_facts.py
# ETL script for Vital Facts table (tab 2)
# Converts data to atomic facts with proper kinds, dates, and source references

import csv
import psycopg
from datetime import datetime
from typing import Dict, Set, Optional

VALID_CONFIDENCE_LEVELS = {"high", "medium", "low"}
REQUIRED_FIELDS = ["student_id", "kind", "value", "fact_date", "confidence", "source_id"]

# Cache for valid fact kinds
FACT_KINDS: Optional[Set[str]] = None

def load_valid_fact_kinds(cursor) -> Set[str]:
    """Load valid fact kinds from database"""
    global FACT_KINDS
    if FACT_KINDS is None:
        cursor.execute("SELECT kind FROM fact_kinds")
        FACT_KINDS = {row[0] for row in cursor.fetchall()}
    return FACT_KINDS

def parse_iso_datetime(date_string: str) -> datetime:
    """Convert ISO format string to datetime"""
    if not date_string or date_string.strip() == "":
        raise ValueError("Empty date string")
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid date format: {date_string}") from e

def validate_fact_row(row: Dict[str, str], valid_kinds: Set[str]) -> None:
    """Validate fact row data"""
    # Check required fields
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    # Validate fact kind
    if row["kind"] not in valid_kinds:
        raise ValueError(f"Unknown fact kind: {row['kind']}. Valid kinds: {sorted(valid_kinds)}")
    
    # Validate confidence
    if row["confidence"] not in VALID_CONFIDENCE_LEVELS:
        raise ValueError(f"Invalid confidence: {row['confidence']}. Must be one of {VALID_CONFIDENCE_LEVELS}")
    
    # Validate source_id exists
    if not row["source_id"]:
        raise ValueError("source_id is required for evidence tracking")

def insert_fact(cursor, row: Dict[str, str]) -> None:
    """Insert a new fact record (no updates - append only)"""
    cursor.execute(
        """
        INSERT INTO vital_facts(
            student_id, kind, value, unit, fact_date, confidence, source_id
        )
        VALUES (
            %(student_id)s, %(kind)s, %(value)s, %(unit)s, 
            %(fact_date)s, %(confidence)s, %(source_id)s
        )
        """,
        {
            "student_id": row["student_id"],
            "kind": row["kind"],
            "value": row["value"],
            "unit": row.get("unit"),
            "fact_date": parse_iso_datetime(row["fact_date"]),
            "confidence": row["confidence"],
            "source_id": row["source_id"]
        }
    )

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for facts"""
    if connection_string is None:
        connection_string = "postgresql://localhost/jenny_ai"
    
    processed = 0
    errors = []
    
    with psycopg.connect(connection_string) as conn:
        with conn.cursor() as cursor:
            # Load valid fact kinds
            valid_kinds = load_valid_fact_kinds(cursor)
            print(f"Loaded {len(valid_kinds)} valid fact kinds")
            
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, start=2):
                    try:
                        validate_fact_row(row, valid_kinds)
                        insert_fact(cursor, row)
                        processed += 1
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        print(f"Error processing row {row_num}: {e}")
            
            conn.commit()
    
    print(f"\nFacts ETL Summary:")
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
    sample = """student_id,kind,value,unit,fact_date,confidence,source_id
huda-2025,sat_total_score,1530,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,sat_math,780,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,sat_ebrw,750,,2024-04-17T00:00:00Z,high,SRC-W044
huda-2025,uc_app_submitted,1,,2023-11-30T00:00:00Z,high,SRC-W080
huda-2025,gpa_weighted,4.65,,2024-06-01T00:00:00Z,high,SRC-TRANSCRIPT
huda-2025,ap_score,5,APUSH,2023-07-15T00:00:00Z,high,SRC-APSCORES
huda-2025,css_profile_submitted,1,,2023-10-15T00:00:00Z,high,SRC-W075
huda-2025,portfolio_demo_count,7,,2024-01-15T00:00:00Z,medium,SRC-W065"""
    return sample

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_facts.py <path_to_csv> [connection_string]")
        print("\nExample CSV format:")
        print(generate_sample_csv())
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)