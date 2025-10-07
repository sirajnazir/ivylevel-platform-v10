#!/usr/bin/env python3
"""
v5.4 Audit Diff - Compare v5.3 vs v5.4 ingestion results
"""

import os
import sys
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_chip_stats(conn, student_id="huda-2025"):
    """Get chip statistics from database."""
    cur = conn.execute("""
        SELECT
            chip_type,
            COUNT(*) as count,
            SUM(tokens) as total_tokens,
            AVG(confidence) as avg_confidence
        FROM kb_chips
        WHERE student_id = %s
        GROUP BY chip_type
        ORDER BY count DESC
    """, (student_id,))

    stats = {}
    for row in cur.fetchall():
        stats[row["chip_type"]] = {
            "count": row["count"],
            "total_tokens": row["total_tokens"] or 0,
            "avg_confidence": float(row["avg_confidence"]) if row["avg_confidence"] else None
        }
    return stats

def get_source_breakdown(conn, student_id="huda-2025"):
    """Get breakdown by source_kind."""
    cur = conn.execute("""
        SELECT
            source_kind,
            COUNT(*) as count
        FROM kb_chips
        WHERE student_id = %s
        GROUP BY source_kind
        ORDER BY count DESC
    """, (student_id,))

    breakdown = {}
    for row in cur.fetchall():
        breakdown[row["source_kind"] or "UNKNOWN"] = row["count"]
    return breakdown

def get_metadata_coverage(conn, student_id="huda-2025"):
    """Get metadata field coverage."""
    cur = conn.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(award) as has_award,
            COUNT(framework) as has_framework,
            COUNT(activity) as has_activity,
            COUNT(phase) as has_phase,
            COUNT(week) as has_week
        FROM kb_chips
        WHERE student_id = %s
    """, (student_id,))

    row = cur.fetchone()
    return {
        "total": row["total"],
        "award_coverage": (row["has_award"] / row["total"] * 100) if row["total"] > 0 else 0,
        "framework_coverage": (row["has_framework"] / row["total"] * 100) if row["total"] > 0 else 0,
        "activity_coverage": (row["has_activity"] / row["total"] * 100) if row["total"] > 0 else 0,
        "phase_coverage": (row["has_phase"] / row["total"] * 100) if row["total"] > 0 else 0,
        "week_coverage": (row["has_week"] / row["total"] * 100) if row["total"] > 0 else 0,
    }

def main():
    print("🔍 KB Ingestion Audit (v5.4)")
    print("=" * 60)

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        # Chip type distribution
        print("\n📊 Chip Distribution:")
        stats = get_chip_stats(conn)
        for chip_type, data in stats.items():
            conf = f"{data['avg_confidence']:.2f}" if data['avg_confidence'] else "N/A"
            print(f"  {chip_type:20s} {data['count']:>5d} chips ({data['total_tokens']:>6d} tokens, conf={conf})")

        total_chips = sum(s["count"] for s in stats.values())
        total_tokens = sum(s["total_tokens"] for s in stats.values())
        print(f"\n  {'TOTAL':20s} {total_chips:>5d} chips ({total_tokens:>6d} tokens)")

        # Source breakdown
        print("\n📂 Source Breakdown:")
        breakdown = get_source_breakdown(conn)
        for source, count in breakdown.items():
            pct = (count / total_chips * 100) if total_chips > 0 else 0
            print(f"  {source:20s} {count:>5d} chips ({pct:>5.1f}%)")

        # Metadata coverage
        print("\n🏷️  Metadata Coverage:")
        coverage = get_metadata_coverage(conn)
        print(f"  Total chips: {coverage['total']}")
        print(f"  Award coverage:     {coverage['award_coverage']:>5.1f}%")
        print(f"  Framework coverage: {coverage['framework_coverage']:>5.1f}%")
        print(f"  Activity coverage:  {coverage['activity_coverage']:>5.1f}%")
        print(f"  Phase coverage:     {coverage['phase_coverage']:>5.1f}%")
        print(f"  Week coverage:      {coverage['week_coverage']:>5.1f}%")

    print("\n" + "=" * 60)
    print("💡 v5.4 Improvements over v5.3:")
    print("  - Metadata-rich chips (award, framework, activity, phase, week)")
    print("  - Content-based deduplication (content_hash)")
    print("  - Confidence scores for quality filtering")
    print("  - Future-proof schema for contributor mode")
    print("  - Blue/green Pinecone migration support")

if __name__ == "__main__":
    main()
