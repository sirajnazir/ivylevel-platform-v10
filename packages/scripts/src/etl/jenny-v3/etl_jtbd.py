# etl_jtbd.py
# ETL script for JTBD Index table (tab 1)

import csv
import psycopg
from datetime import datetime
from typing import Dict, Optional

REQUIRED_FIELDS = ["jtbd_id", "student_id", "jtbd_title"]

def parse_iso_datetime(date_string: Optional[str]) -> Optional[datetime]:
    """Convert ISO format string to datetime"""
    if not date_string or date_string.strip() == "":
        return None
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None

def map_domain(category: str, subcategory: str) -> Optional[str]:
    """Map category/subcategory to lifecycle_domain"""
    mapping = {
        'application': 'application',
        'apps': 'application',
        'test': 'test',
        'testing': 'test',
        'essay': 'essay',
        'essays': 'essay',
        'recommender': 'recommender',
        'rec': 'recommender',
        'ec': 'ec_portfolio',
        'portfolio': 'ec_portfolio',
        'aid': 'aid_css_fafsa',
        'fafsa': 'aid_css_fafsa',
        'css': 'aid_css_fafsa',
        'award': 'award',
        'awards': 'award'
    }
    
    # Check category and subcategory
    cat_lower = (category or '').lower()
    subcat_lower = (subcategory or '').lower()
    
    for key, domain in mapping.items():
        if key in cat_lower or key in subcat_lower:
            return domain
    
    return None

def upsert_jtbd(cursor, row: Dict[str, str]) -> None:
    """Insert or update JTBD record"""
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            raise ValueError(f"Missing required field: {field}")
    
    # Map domain
    domain = map_domain(row.get('category', ''), row.get('subcategory', ''))
    
    # Parse dates
    date_start = parse_iso_datetime(row.get('source_date'))
    date_end = None  # Could be derived from status completion
    
    cursor.execute(
        """
        INSERT INTO jtbd(
            jtbd_id, student_id, jtbd_title, phase, 
            date_start, date_end, synopsis
        )
        VALUES (
            %(jtbd_id)s, %(student_id)s, %(jtbd_title)s, %(phase)s,
            %(date_start)s, %(date_end)s, %(synopsis)s
        )
        ON CONFLICT (jtbd_id) DO UPDATE SET
            jtbd_title = EXCLUDED.jtbd_title,
            phase = EXCLUDED.phase,
            date_start = EXCLUDED.date_start,
            date_end = EXCLUDED.date_end,
            synopsis = EXCLUDED.synopsis;
        """,
        {
            "jtbd_id": row["jtbd_id"],
            "student_id": row["student_id"],
            "jtbd_title": row["jtbd_title"],
            "phase": row.get("phase"),
            "date_start": date_start,
            "date_end": date_end,
            "synopsis": row.get("jtbd_desc")
        }
    )

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for JTBD"""
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
                        upsert_jtbd(cursor, row)
                        processed += 1
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        print(f"Error processing row {row_num}: {e}")
            
            conn.commit()
    
    print(f"\nJTBD ETL Summary:")
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
        print("Usage: python etl_jtbd.py <path_to_csv> [connection_string]")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)