#!/usr/bin/env python3
"""
Safe deletion of Pinecone namespaces.
Requires explicit confirmation before deleting.
"""
import os
import sys
from pinecone import Pinecone

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")

# Protected namespaces (cannot be deleted)
PROTECTED_NAMESPACES = [
    "KBv6_2025-10-06_v1.0",           # Sessions+Exec
    "KBv6_iMessage_2025-10-07_v1.0",  # iMessage
    "KBv6_Assessment_2025-10-07_v1.0" # Assessment+GamePlan
]

def delete_namespace(index, namespace: str, dry_run: bool = False):
    """
    Delete namespace from Pinecone index.
    """
    # Safety check: protect production namespaces
    if namespace in PROTECTED_NAMESPACES:
        print(f"❌ Cannot delete protected namespace: {namespace}")
        print(f"   Protected: {', '.join(PROTECTED_NAMESPACES)}")
        sys.exit(1)

    # Get namespace stats
    print(f"\n🔍 Checking namespace: {namespace}")
    stats = index.describe_index_stats()
    ns_stats = stats.get("namespaces", {}).get(namespace, {})
    vector_count = ns_stats.get("vector_count", 0)

    if vector_count == 0:
        print(f"  ⚠️  Namespace '{namespace}' not found or empty.")
        return False

    print(f"  Vector count: {vector_count}")

    if dry_run:
        print(f"  🏃 DRY RUN: Would delete {vector_count} vectors from '{namespace}'")
        return True

    # Confirmation prompt
    print()
    print(f"⚠️  WARNING: You are about to delete namespace '{namespace}'")
    print(f"   This will permanently remove {vector_count} vectors.")
    print(f"   This action cannot be undone.")
    print()
    confirm = input(f"Type '{namespace}' to confirm deletion: ")

    if confirm != namespace:
        print("❌ Deletion cancelled (confirmation mismatch)")
        sys.exit(1)

    # Delete namespace
    print(f"\n🗑️  Deleting namespace: {namespace}")

    # Pinecone doesn't have direct namespace deletion, we need to delete all vectors
    # We'll use delete_all() which is the recommended approach
    try:
        index.delete(delete_all=True, namespace=namespace)
        print(f"  ✅ Deleted all vectors from '{namespace}'")
        return True
    except Exception as e:
        print(f"  ❌ Error deleting namespace: {e}")
        sys.exit(1)

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage: python3 delete_namespace.py <namespace> [--dry-run]")
        print()
        print("Examples:")
        print("  python3 tools/ops/delete_namespace.py jenny_v2")
        print("  python3 tools/ops/delete_namespace.py interactions --dry-run")
        print()
        print("Legacy namespaces to delete:")
        print("  - jenny_v2 (877 vectors)")
        print("  - interactions (346 vectors)")
        print("  - jtbd (148 vectors)")
        sys.exit(1)

    namespace = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    print(f"🔍 Connecting to Pinecone index: {PINECONE_INDEX}")

    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)

    # Delete namespace
    success = delete_namespace(index, namespace, dry_run=dry_run)

    if success and not dry_run:
        print()
        print("✅ Namespace deletion complete")
        print()
        print("🔍 Verify deletion:")
        print(f"   PINECONE_INDEX={PINECONE_INDEX} python3 tools/qa/audit_legacy_namespaces.py")
    elif success and dry_run:
        print()
        print("✅ Dry run complete (no changes made)")

if __name__ == "__main__":
    main()
