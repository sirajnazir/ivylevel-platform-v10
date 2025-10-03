# etl_facts_mapped.py
# ETL script for Facts with column mapping from actual CSV

import csv
import psycopg
from datetime import datetime
from typing import Dict, Set, Optional

REQUIRED_FIELDS = ["fact_id", "student_id", "name", "value", "effective_date", "source_ref"]
VALID_CONFIDENCE_LEVELS = {"high", "medium", "low"}

# Cache for valid fact kinds
FACT_KINDS: Optional[Set[str]] = None

def load_valid_fact_kinds(cursor) -> Set[str]:
    """Load valid fact kinds from database"""
    global FACT_KINDS
    if FACT_KINDS is None:
        cursor.execute("SELECT kind FROM fact_kinds")
        FACT_KINDS = {row[0] for row in cursor.fetchall()}
    return FACT_KINDS

def parse_date(date_string: str) -> datetime:
    """Parse date in YYYY-MM-DD format"""
    if not date_string or date_string.strip() == "":
        raise ValueError("Empty date string")
    try:
        # Handle YYYY-MM-DD format
        if len(date_string) == 10 and date_string[4] == '-':
            return datetime.strptime(date_string, "%Y-%m-%d")
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError) as e:
        raise ValueError(f"Invalid date format: {date_string}") from e

def map_fact_kind(domain: str, name: str) -> str:
    """Map domain/name combination to fact_kind"""
    # Normalize inputs
    domain_lower = (domain or '').lower()
    name_lower = (name or '').lower()
    
    # Direct mappings
    mapping = {
        'sat': 'sat_total_score',
        'sat_total': 'sat_total_score',
        'sat_math': 'sat_math',
        'sat_ebrw': 'sat_ebrw',
        'act': 'act_composite',
        'ap': 'ap_score',
        'gpa_weighted': 'gpa_weighted',
        'gpa_unweighted': 'gpa_unweighted',
        'uc_app': 'uc_app_submitted',
        'css': 'css_profile_submitted',
        'fafsa': 'fafsa_submitted',
        'portfolio': 'portfolio_demo_count',
        'award': 'award_won',
    }
    
    # Check name first
    for key, kind in mapping.items():
        if key in name_lower:
            return kind
    
    # Domain-based defaults
    if 'test' in domain_lower or 'score' in domain_lower:
        if 'sat' in name_lower:
            return 'sat_total_score'
        elif 'act' in name_lower:
            return 'act_composite'
    
    # Default to a generic kind
    return 'coach_session_count'  # Generic fact type

def ensure_source_exists(cursor, source_ref: str, student_id: str):
    """Ensure the source exists, create if needed"""
    # Check if source exists
    cursor.execute("SELECT source_id FROM sources WHERE source_id = %s", (source_ref,))
    if cursor.fetchone():
        return source_ref
    
    # Create a generic source
    cursor.execute(
        """
        INSERT INTO sources(source_id, student_id, source_type, title)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (source_id) DO NOTHING
        """,
        (source_ref, student_id, 'other', source_ref)
    )
    return source_ref

def insert_fact(cursor, row: Dict[str, str], valid_kinds: Set[str]) -> None:
    """Insert a fact record"""
    # Map fact kind
    kind = map_fact_kind(row.get('domain', ''), row['name'])
    
    # Ensure kind exists
    if kind not in valid_kinds:
        cursor.execute(
            "INSERT INTO fact_kinds(kind, description) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (kind, f"Auto-created for {row['name']}")
        )
        valid_kinds.add(kind)
    
    # Ensure source exists
    source_id = ensure_source_exists(cursor, row['source_ref'], row['student_id'])
    
    # Get confidence
    confidence = row.get('confidence', 'medium').lower()
    if confidence not in VALID_CONFIDENCE_LEVELS:
        confidence = 'medium'
    
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
            "kind": kind,
            "value": row["value"],
            "unit": row.get("unit") if row.get("unit") else None,
            "fact_date": parse_date(row["effective_date"]),
            "confidence": confidence,
            "source_id": source_id
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
                        # Check required fields
                        for field in REQUIRED_FIELDS:
                            if not row.get(field):
                                raise ValueError(f"Missing required field: {field}")
                        
                        insert_fact(cursor, row, valid_kinds)
                        processed += 1
                        
                        if processed % 100 == 0:
                            conn.commit()
                            print(f"  Processed {processed} facts...")
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        if len(errors) <= 10:
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

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_facts_mapped.py <path_to_csv> [connection_string]")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)