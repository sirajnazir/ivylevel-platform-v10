# etl_outcomes.py
# ETL script for Outcomes table (tab 4)
# Handles admission results, milestones, and lifecycle tracking

import csv
import json
import psycopg
from datetime import datetime
from typing import Dict, Optional, Any, Set

VALID_ADMISSION_RESULTS = {"accepted", "waitlisted", "rejected", "deferred", "withdrawn", "unknown"}
VALID_OUTCOME_TYPES = {
    "admission", "plan", "tracking", "momentum", "artifact", "draft", 
    "submission", "result", "milestone", "ops", "policy", "registry", 
    "content_bank", "communication", "planning"
}

# Type mapping for common variations/typos
OUTCOME_TYPE_MAPPING = {
    "admissions": "admission",
    "admit": "admission",
    "results": "result",
    "milestones": "milestone",
    "communications": "communication"
}

def parse_iso_datetime(date_string: Optional[str]) -> Optional[datetime]:
    """Convert ISO format string to datetime"""
    if not date_string or date_string.strip() == "":
        return None
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        print(f"Warning: Invalid date format: {date_string}")
        return None

def parse_json_details(details_string: Optional[str]) -> Optional[Dict[str, Any]]:
    """Parse JSON details, handling various formats"""
    if not details_string or details_string.strip() == "":
        return None
    
    try:
        return json.loads(details_string)
    except json.JSONDecodeError:
        # If not valid JSON, store as raw text
        return {"raw": details_string}

def normalize_outcome_type(type_string: str) -> str:
    """Normalize outcome type to canonical value"""
    normalized = type_string.lower().strip()
    return OUTCOME_TYPE_MAPPING.get(normalized, normalized)

def create_or_update_lifecycle_item(cursor, row: Dict[str, str]) -> Optional[str]:
    """Create or update lifecycle item for application outcomes"""
    outcome_type = normalize_outcome_type(row["type"])
    
    # Only create lifecycle items for admission/result types with schools
    if outcome_type not in ("admission", "result") or not row.get("school"):
        return row.get("lifecycle_item_id")
    
    # Generate item ID if not provided
    student_year = row["student_id"].split("-")[-1]
    school_name = row["school"].upper().replace(" ", "_")
    item_id = row.get("lifecycle_item_id") or f"APP-{school_name}-{student_year}"
    
    # Determine status based on admission result
    admission_result = row.get("admission_result", "").lower()
    if admission_result in ("accepted", "waitlisted", "rejected"):
        status = "outcome"
    elif row.get("submitted"):
        status = "submitted"
    else:
        status = "planned"
    
    cursor.execute(
        """
        INSERT INTO lifecycle_items(
            item_id, student_id, jtbd_id, domain, status, 
            school, submitted_at, outcome_date
        )
        VALUES (
            %(item_id)s, %(student_id)s, %(jtbd_id)s, 'application', %(status)s,
            %(school)s, %(submitted_at)s, %(outcome_date)s
        )
        ON CONFLICT (item_id) DO UPDATE SET
            status = EXCLUDED.status,
            submitted_at = COALESCE(EXCLUDED.submitted_at, lifecycle_items.submitted_at),
            outcome_date = COALESCE(EXCLUDED.outcome_date, lifecycle_items.outcome_date);
        """,
        {
            "item_id": item_id,
            "student_id": row["student_id"],
            "jtbd_id": row.get("jtbd_id"),
            "status": status,
            "school": row["school"],
            "submitted_at": parse_iso_datetime(row.get("submitted")),
            "outcome_date": parse_iso_datetime(row.get("outcome_date"))
        }
    )
    
    return item_id

def insert_outcome(cursor, row: Dict[str, str], lifecycle_item_id: Optional[str]) -> str:
    """Insert outcome record"""
    outcome_type = normalize_outcome_type(row["type"])
    admission_result = row.get("admission_result")
    
    # Validate admission result if provided
    if admission_result and admission_result not in VALID_ADMISSION_RESULTS:
        raise ValueError(f"Invalid admission_result: {admission_result}")
    
    cursor.execute(
        """
        INSERT INTO outcomes(
            jtbd_id, student_id, type, admission_result, lifecycle_item_id,
            details_json, occurred_at, source_id
        )
        VALUES (
            %(jtbd_id)s, %(student_id)s, %(type)s, %(admission_result)s,
            %(lifecycle_item_id)s, %(details_json)s, %(occurred_at)s, %(source_id)s
        )
        RETURNING outcome_id;
        """,
        {
            "jtbd_id": row.get("jtbd_id"),
            "student_id": row["student_id"],
            "type": outcome_type,
            "admission_result": admission_result,
            "lifecycle_item_id": lifecycle_item_id,
            "details_json": parse_json_details(row.get("details_json")),
            "occurred_at": parse_iso_datetime(row.get("occurred_at")),
            "source_id": row.get("source_id")
        }
    )
    
    result = cursor.fetchone()
    return str(result[0])

def run(csv_path: str, connection_string: str = None) -> None:
    """Main ETL function for outcomes"""
    if connection_string is None:
        connection_string = "postgresql://localhost/jenny_ai"
    
    processed = 0
    errors = []
    seen_keys: Set[str] = set()  # For deduplication
    
    with psycopg.connect(connection_string) as conn:
        with conn.cursor() as cursor:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Validate required fields
                        if not row.get("student_id"):
                            raise ValueError("Missing required field: student_id")
                        if not row.get("type"):
                            raise ValueError("Missing required field: type")
                        
                        # Normalize type
                        outcome_type = normalize_outcome_type(row["type"])
                        if outcome_type not in VALID_OUTCOME_TYPES:
                            raise ValueError(f"Invalid outcome type: {outcome_type}")
                        
                        # Create deduplication key
                        details_str = json.dumps(
                            parse_json_details(row.get("details_json")), 
                            sort_keys=True
                        )
                        dedup_key = (
                            row["student_id"],
                            row.get("jtbd_id"),
                            outcome_type,
                            details_str,
                            row.get("occurred_at")
                        )
                        
                        # Skip duplicates
                        if dedup_key in seen_keys:
                            print(f"Skipping duplicate row {row_num}")
                            continue
                        seen_keys.add(dedup_key)
                        
                        # Create/update lifecycle item if applicable
                        lifecycle_item_id = create_or_update_lifecycle_item(cursor, row)
                        
                        # Insert outcome
                        outcome_id = insert_outcome(cursor, row, lifecycle_item_id)
                        processed += 1
                        
                    except Exception as e:
                        errors.append(f"Row {row_num}: {str(e)}")
                        print(f"Error processing row {row_num}: {e}")
            
            conn.commit()
    
    print(f"\nOutcomes ETL Summary:")
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
    sample = """jtbd_id,student_id,type,school,submitted,outcome_date,admission_result,occurred_at,details_json,source_id
JTBD-W080-USC,huda-2025,admission,USC,2023-10-27T00:00:00Z,2024-03-25T00:00:00Z,accepted,2024-03-25T00:00:00Z,"{""major"":""CS Games"",""scholarship"":""Presidential""}",SRC-W080
JTBD-W090-UNC,huda-2025,admission,UNC Chapel Hill,2023-11-15T00:00:00Z,2024-02-01T00:00:00Z,waitlisted,2024-02-01T00:00:00Z,"{""honors"":true,""notes"":""Strong candidate""}",SRC-W081
JTBD-W085-UCLA,huda-2025,admission,UCLA,2023-11-30T00:00:00Z,2024-03-15T00:00:00Z,accepted,2024-03-15T00:00:00Z,"{""major"":""Computer Science""}",SRC-W082
JTBD-W041-CAMERON,huda-2025,milestone,,,,,2024-04-17T00:00:00Z,"{""type"":""test_complete"",""description"":""SAT final score 1530""}",SRC-W044
JTBD-W065-PORTFOLIO,huda-2025,artifact,,,,,2024-06-20T00:00:00Z,"{""type"":""portfolio"",""count"":7,""url"":""https://portfolio.example.com""}",SRC-W065"""
    return sample

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python etl_outcomes.py <path_to_csv> [connection_string]")
        print("\nExample CSV format:")
        print(generate_sample_csv())
        sys.exit(1)
    
    csv_path = sys.argv[1]
    conn_string = sys.argv[2] if len(sys.argv) > 2 else None
    
    run(csv_path, conn_string)