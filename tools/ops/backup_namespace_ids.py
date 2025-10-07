#!/usr/bin/env python3
"""
Backup Pinecone namespace IDs and metadata samples before deletion.
Creates a manifest for safe recovery if needed.
"""
import os
import json
import sys
from datetime import datetime
from pinecone import Pinecone

# Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")

def backup_namespace(index, namespace: str, output_dir: str = "backups"):
    """
    Backup namespace: export all IDs and sample metadata.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    print(f"\n📦 Backing up namespace: {namespace}")

    # Get namespace stats
    stats = index.describe_index_stats()
    ns_stats = stats.get("namespaces", {}).get(namespace, {})
    vector_count = ns_stats.get("vector_count", 0)

    if vector_count == 0:
        print(f"  ⚠️  Namespace '{namespace}' not found or empty. Skipping.")
        return None

    print(f"  Vector count: {vector_count}")

    # Fetch sample vectors (up to 100) for metadata inspection
    print(f"  Fetching sample metadata...")

    # Query with dummy vector to get IDs
    dummy_query = index.query(
        namespace=namespace,
        vector=[0.0] * 3072,  # Assuming 3072 dim
        top_k=100,
        include_metadata=True
    )

    samples = []
    for match in dummy_query.get("matches", []):
        samples.append({
            "id": match.get("id"),
            "score": match.get("score"),
            "metadata": match.get("metadata", {})
        })

    # Create backup manifest
    manifest = {
        "namespace": namespace,
        "index": PINECONE_INDEX,
        "backup_timestamp": datetime.utcnow().isoformat() + "Z",
        "vector_count": vector_count,
        "dimension": stats.get("dimension", 3072),
        "sample_vectors": samples,
        "sample_count": len(samples),
    }

    # Save manifest
    filename = f"{output_dir}/{namespace}_backup_{timestamp}.json"
    with open(filename, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"  ✅ Backup saved: {filename}")
    print(f"  Sampled {len(samples)} vectors (out of {vector_count} total)")

    return filename

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    # Get namespace from args or env
    if len(sys.argv) > 1:
        namespaces = sys.argv[1:]
    else:
        # Default to legacy namespaces
        namespaces = ["jenny_v2", "interactions", "jtbd"]

    print(f"🔍 Connecting to Pinecone index: {PINECONE_INDEX}")

    # Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)

    # Backup each namespace
    results = []
    for ns in namespaces:
        result = backup_namespace(index, ns)
        if result:
            results.append(result)

    print()
    if results:
        print(f"✅ Backed up {len(results)} namespace(s)")
        print(f"📁 Backup location: backups/")
        print()
        print("⚠️  Note: Backups only contain IDs and metadata samples (not vectors).")
        print("   Vectors cannot be exported from Pinecone. Use backups for audit only.")
    else:
        print("⚠️  No namespaces backed up (all empty or not found)")

if __name__ == "__main__":
    main()
