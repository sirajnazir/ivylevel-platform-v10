#!/usr/bin/env python3
"""
KB Namespace Cleanup Script
Deletes old kb_v5_4 namespace to prepare for re-ingestion with correct embedding model.

Usage:
  python3 scripts/cleanup_kb_namespace.py --namespace kb_v5_4 --confirm
"""

import os
import sys
from pinecone import Pinecone

def delete_namespace(namespace: str, confirm: bool = False):
    """Delete a Pinecone namespace safely."""

    api_key = os.getenv("PINECONE_API_KEY")
    index_name = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")

    if not api_key:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    if not confirm:
        print(f"⚠️  DRY RUN: Would delete namespace '{namespace}'")
        print(f"   Use --confirm to actually delete")
        return

    print(f"🗑️  Deleting namespace: {namespace}")

    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    # Get stats before deletion
    stats = index.describe_index_stats()
    ns_count = stats.get("namespaces", {}).get(namespace, {}).get("vector_count", 0)

    if ns_count == 0:
        print(f"⚠️  Namespace '{namespace}' not found or already empty")
        return

    print(f"   Current vectors: {ns_count}")
    print(f"   Deleting all vectors...")

    # Delete the namespace
    index.delete(namespace=namespace, delete_all=True)

    print(f"✅ Deleted namespace '{namespace}'")
    print(f"   Run describe_index_stats() to verify")

    # Verify
    import time
    time.sleep(2)
    new_stats = index.describe_index_stats()
    remaining = new_stats.get("namespaces", {}).get(namespace, {}).get("vector_count", 0)

    if remaining == 0:
        print(f"✅ Verification passed: namespace '{namespace}' is empty")
    else:
        print(f"⚠️  Warning: {remaining} vectors still remain. May need more time to sync.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Delete Pinecone KB namespace")
    parser.add_argument("--namespace", default="kb_v5_4", help="Namespace to delete")
    parser.add_argument("--confirm", action="store_true", help="Actually perform deletion")

    args = parser.parse_args()

    delete_namespace(args.namespace, args.confirm)
