#!/usr/bin/env python3
"""
Academics Timeline Ingestion Script
Loads generated timeline JSON into academics_vitals and academics_events tables.

Usage:
  python3 scripts/ingest_academics_timeline.py < timeline.json
"""

import json
import sys
import os
import psycopg2
from psycopg2.extras import execute_values

def get_db_conn():
    """Get database connection from DATABASE_URL env var"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)

def ingest_vitals(conn, vitals):
    """Insert/update vitals rows"""
    with conn.cursor() as cur:
        # Prepare rows for batch insert
        rows = [
            (
                v["student_id"],
                v["week_no"],
                v["as_of_date"],
                v.get("gpa_unweighted"),
                v.get("gpa_weighted"),
                v.get("ap_count_cum"),
                v.get("honors_count_cum"),
                v.get("core_stem_load"),
                v.get("workload_hours_week"),
                json.dumps(v.get("current_courses")) if v.get("current_courses") else None,
                json.dumps(v.get("assessments")) if v.get("assessments") else None,
                v.get("notes"),
                json.dumps(v["provenance"])
            )
            for v in vitals
        ]

        # Batch upsert
        execute_values(cur, """
            INSERT INTO academics_vitals (
                student_id, week_no, as_of_date,
                gpa_unweighted, gpa_weighted, ap_count_cum, honors_count_cum,
                core_stem_load, workload_hours_week,
                current_courses, assessments, notes, provenance
            ) VALUES %s
            ON CONFLICT (student_id, week_no) DO UPDATE SET
                as_of_date = EXCLUDED.as_of_date,
                gpa_unweighted = COALESCE(EXCLUDED.gpa_unweighted, academics_vitals.gpa_unweighted),
                gpa_weighted   = COALESCE(EXCLUDED.gpa_weighted, academics_vitals.gpa_weighted),
                ap_count_cum   = COALESCE(EXCLUDED.ap_count_cum, academics_vitals.ap_count_cum),
                honors_count_cum = COALESCE(EXCLUDED.honors_count_cum, academics_vitals.honors_count_cum),
                core_stem_load = COALESCE(EXCLUDED.core_stem_load, academics_vitals.core_stem_load),
                workload_hours_week = COALESCE(EXCLUDED.workload_hours_week, academics_vitals.workload_hours_week),
                current_courses = COALESCE(EXCLUDED.current_courses, academics_vitals.current_courses),
                assessments     = COALESCE(EXCLUDED.assessments, academics_vitals.assessments),
                notes           = COALESCE(EXCLUDED.notes, academics_vitals.notes),
                provenance      = EXCLUDED.provenance,
                updated_at      = NOW()
        """, rows)

    conn.commit()
    return len(rows)

def ingest_events(conn, events):
    """Insert events (skip on conflict)"""
    if not events:
        return 0

    with conn.cursor() as cur:
        rows = [
            (
                e["student_id"],
                e["event_id"],
                e["week_no"],
                e["event_date"],
                e["event_type"],
                e["label"],
                json.dumps(e.get("details", {})),
                json.dumps(e["provenance"])
            )
            for e in events
        ]

        execute_values(cur, """
            INSERT INTO academics_events (
                student_id, event_id, week_no, event_date,
                event_type, label, details, provenance
            ) VALUES %s
            ON CONFLICT (student_id, event_id) DO NOTHING
        """, rows)

    conn.commit()
    return len(rows)

def main():
    """Main ingestion logic"""
    data = json.load(sys.stdin)

    vitals = data.get("vitals", [])
    events = data.get("events", [])
    metadata = data.get("metadata", {})

    print(f"📊 Ingesting academics timeline for {metadata.get('student_id', 'unknown')}")
    print(f"   Vitals rows: {len(vitals)}")
    print(f"   Events: {len(events)}")

    conn = get_db_conn()

    try:
        vitals_count = ingest_vitals(conn, vitals)
        print(f"✅ Inserted/updated {vitals_count} vitals rows")

        events_count = ingest_events(conn, events)
        print(f"✅ Inserted {events_count} event rows")

        # Verify insertion
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM academics_vitals
                WHERE student_id = %s
            """, (metadata.get("student_id"),))
            total = cur.fetchone()[0]
            print(f"✅ Total vitals for student: {total}")

            cur.execute("""
                SELECT gpa_unweighted, gpa_weighted, ap_count_cum
                FROM v_academics_latest
                WHERE student_id = %s
            """, (metadata.get("student_id"),))
            latest = cur.fetchone()
            if latest:
                print(f"📈 Latest vitals: GPA U={latest[0]}, W={latest[1]}, AP={latest[2]}")

    finally:
        conn.close()

    print("✅ Ingestion complete")

if __name__ == "__main__":
    main()
