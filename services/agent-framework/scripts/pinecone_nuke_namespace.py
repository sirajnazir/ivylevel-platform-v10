#!/usr/bin/env python3
"""
Pinecone Namespace Deletion Script
Deletes a specific namespace while preserving the index and other namespaces.

Usage:
  export PINECONE_API_KEY=...
  export PINECONE_INDEX_NAME=jenny-v3-3072-093025
  export PINECONE_NAMESPACE_OLD=kb_v5_4
  python3 scripts/pinecone_nuke_namespace.py
"""

from pinecone import Pinecone
import os
import sys

INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
NUKE_NAMESPACE = os.getenv("PINECONE_NAMESPACE_OLD", "kb_v5_4")

def main():
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("❌ PINECONE_API_KEY environment variable not set")
        sys.exit(1)

    print(f"🗑️  Deleting namespace: {NUKE_NAMESPACE} from index: {INDEX}")

    pc = Pinecone(api_key=api_key)
    idx = pc.Index(INDEX)

    # Get stats before deletion
    try:
        stats = idx.describe_index_stats()
        ns_count = stats.get("namespaces", {}).get(NUKE_NAMESPACE, {}).get("vector_count", 0)
        print(f"   Current vectors in namespace: {ns_count}")
    except Exception as e:
        print(f"⚠️  Could not get stats: {e}")

    # Delete the namespace
    try:
        idx.delete(namespace=NUKE_NAMESPACE, delete_all=True)
        print(f"✅ Deleted namespace: {NUKE_NAMESPACE} from index: {INDEX}")
    except Exception as e:
        print(f"❌ Error deleting namespace: {e}")
        sys.exit(1)

    # Verify
    import time
    time.sleep(2)
    try:
        stats = idx.describe_index_stats()
        remaining = stats.get("namespaces", {}).get(NUKE_NAMESPACE, {}).get("vector_count", 0)
        if remaining == 0:
            print(f"✅ Verification: namespace '{NUKE_NAMESPACE}' is empty")
        else:
            print(f"⚠️  Warning: {remaining} vectors still present (may take time to sync)")
    except Exception as e:
        print(f"⚠️  Could not verify deletion: {e}")

if __name__ == "__main__":
    main()
