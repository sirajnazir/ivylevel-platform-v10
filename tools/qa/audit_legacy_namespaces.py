#!/usr/bin/env python3
"""
Audit legacy Pinecone namespaces before deletion.
Checks presence and vector counts for legacy namespaces: jenny_v2, interactions, jtbd
"""
import os
import json
import sys
from datetime import datetime
from pinecone import Pinecone

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")

# Legacy namespaces to audit
LEGACY_NAMESPACES = ["jenny_v2", "interactions", "jtbd"]

# Current production namespaces (KBv6)
PRODUCTION_NAMESPACES = [
    "KBv6_2025-10-06_v1.0",           # Sessions+Exec (924)
    "KBv6_iMessage_2025-10-07_v1.0",  # iMessage (40)
    "KBv6_Assessment_2025-10-07_v1.0" # Assessment+GamePlan (9)
]

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🔍 Auditing Pinecone index: {PINECONE_INDEX}\n")

    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)

    # Get index stats
    stats = index.describe_index_stats()
    namespaces = stats.get("namespaces", {})

    # Build audit report
    report = {
        "index": PINECONE_INDEX,
        "audit_timestamp": datetime.utcnow().isoformat() + "Z",
        "total_vectors": stats.get("total_vector_count", 0),
        "dimension": stats.get("dimension", 0),
        "production_namespaces": {},
        "legacy_namespaces": {},
    }

    # Audit production namespaces
    print("📊 Production Namespaces (KBv6):")
    for ns in PRODUCTION_NAMESPACES:
        present = ns in namespaces
        count = namespaces.get(ns, {}).get("vector_count", 0) if present else 0
        report["production_namespaces"][ns] = {
            "present": present,
            "vector_count": count,
        }
        status = "✅" if present and count > 0 else "⚠️"
        print(f"  {status} {ns}: {count} vectors")

    print()

    # Audit legacy namespaces
    print("🗑️  Legacy Namespaces (to be deleted):")
    legacy_found = False
    for ns in LEGACY_NAMESPACES:
        present = ns in namespaces
        count = namespaces.get(ns, {}).get("vector_count", 0) if present else 0
        report["legacy_namespaces"][ns] = {
            "present": present,
            "vector_count": count,
        }
        if present:
            legacy_found = True
            print(f"  ⚠️  {ns}: {count} vectors (SHOULD BE DELETED)")
        else:
            print(f"  ✅ {ns}: not found (already clean)")

    print()

    # Summary
    prod_total = sum(ns.get("vector_count", 0) for ns in report["production_namespaces"].values())
    legacy_total = sum(ns.get("vector_count", 0) for ns in report["legacy_namespaces"].values())

    print("📈 Summary:")
    print(f"  Production vectors (KBv6): {prod_total}")
    print(f"  Legacy vectors: {legacy_total}")
    print(f"  Total index vectors: {report['total_vectors']}")
    print()

    # Save report
    report_file = "audit_legacy_namespaces.json"
    with open(report_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"💾 Audit report saved: {report_file}")

    # Exit status
    if legacy_found:
        print()
        print("⚠️  Legacy namespaces found. Recommend deletion to prevent retrieval pollution.")
        print("   Run: python3 tools/ops/delete_namespace.py --namespace <name>")
        sys.exit(1)
    else:
        print()
        print("✅ No legacy namespaces found. Index is clean.")
        sys.exit(0)

if __name__ == "__main__":
    main()
