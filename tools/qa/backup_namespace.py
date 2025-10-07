#!/usr/bin/env python3
"""
Backup Namespace - Export vector IDs and metadata for rollback capability
Creates timestamped snapshots that can be used to restore or verify state
"""
import os
import sys
import json
import time
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
SNAPSHOTS_DIR = "data/kb_intel_chips/snapshots"

def list_all_ids(idx, namespace, limit=10000):
    """List all vector IDs in a namespace"""
    ids = []
    pagination_token = None

    print(f"  Fetching IDs from {namespace}...")

    while True:
        try:
            if pagination_token:
                response = idx.list(namespace=namespace, limit=100, pagination_token=pagination_token)
            else:
                response = idx.list(namespace=namespace, limit=100, prefix="")

            batch = list(response)
            ids.extend(batch)
            print(f"  Progress: {len(ids)} IDs...", end='\r')

            if not hasattr(response, 'pagination') or not response.pagination or not response.pagination.next:
                break

            pagination_token = response.pagination.next

            if len(ids) >= limit:
                break

        except Exception as e:
            print(f"\n  Warning: Error during pagination: {e}")
            break

    print(f"  Total IDs fetched: {len(ids)}")
    return ids

def fetch_metadata_batch(idx, namespace, ids, batch_size=5):
    """Fetch metadata for a batch of IDs"""
    metadata_map = {}

    for i in range(0, len(ids), batch_size):
        batch = ids[i:i+batch_size]
        try:
            vec = idx.fetch(ids=batch, namespace=namespace)
            for vec_id in batch:
                if vec_id in vec.vectors:
                    metadata_map[vec_id] = vec.vectors[vec_id].metadata
        except Exception as e:
            print(f"    Warning: Failed to fetch batch {i}-{i+batch_size}: {e}")
            # Continue with next batch
            continue

    return metadata_map

def backup_namespace(idx, namespace, output_dir):
    """Backup a single namespace"""
    print(f"\n{'='*80}")
    print(f"Backing up namespace: {namespace}")
    print(f"{'='*80}")

    # Get all IDs
    ids = list_all_ids(idx, namespace)

    if not ids:
        print(f"  ⚠️  No vectors found in namespace")
        return None

    # Fetch metadata for subset (to save time, fetch metadata for first 100 only)
    # For full backup, remove the [:100] slice
    print(f"  Fetching metadata sample (first 100 vectors)...")
    sample_metadata = fetch_metadata_batch(idx, namespace, ids[:100], batch_size=5)

    # Get namespace stats
    stats = idx.describe_index_stats()
    ns_stats = stats.namespaces.get(namespace, {})

    # Create backup manifest
    backup = {
        'namespace': namespace,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'vector_count': len(ids),
        'vector_count_pinecone': ns_stats.get('vector_count', 0),
        'vector_ids': ids,
        'sample_metadata': sample_metadata,
        'index': {
            'name': idx._config.index_name,
            'dimension': stats.dimension,
            'metric': 'cosine'
        }
    }

    # Save backup
    os.makedirs(output_dir, exist_ok=True)
    backup_file = f"{output_dir}/{namespace}.json"

    with open(backup_file, 'w') as f:
        json.dump(backup, f, indent=2)

    print(f"  ✅ Backup saved: {backup_file}")
    print(f"     Vector count: {len(ids)}")
    print(f"     Metadata samples: {len(sample_metadata)}")

    return backup

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print("💾 Namespace Backup Utility\n")

    # Get namespaces from args or env
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--namespaces', nargs='+', help='Namespaces to backup')
    parser.add_argument('--all', action='store_true', help='Backup all namespaces')
    args = parser.parse_args()

    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    # Determine which namespaces to backup
    if args.all:
        stats = idx.describe_index_stats()
        namespaces = list(stats.namespaces.keys())
        print(f"Found {len(namespaces)} namespaces to backup")
    elif args.namespaces:
        namespaces = args.namespaces
    else:
        # Default to known namespaces
        namespaces = [
            os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0"),
            os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")
        ]

    # Create snapshot directory
    snapshot_timestamp = time.strftime('%Y%m%d_%H%M%S')
    snapshot_dir = f"{SNAPSHOTS_DIR}/{snapshot_timestamp}"

    print(f"Snapshot directory: {snapshot_dir}")
    print(f"Namespaces: {', '.join(namespaces)}\n")

    # Backup each namespace
    backups = []
    for ns in namespaces:
        backup = backup_namespace(idx, ns, snapshot_dir)
        if backup:
            backups.append(backup)

    # Create snapshot manifest
    manifest = {
        'snapshot_timestamp': snapshot_timestamp,
        'pinecone_index': PINECONE_INDEX,
        'namespaces': [b['namespace'] for b in backups],
        'total_vectors': sum(b['vector_count'] for b in backups),
        'backup_files': [f"{snapshot_dir}/{b['namespace']}.json" for b in backups]
    }

    manifest_file = f"{snapshot_dir}/MANIFEST.json"
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Summary
    print(f"\n{'='*80}")
    print("📊 BACKUP SUMMARY")
    print(f"{'='*80}")
    print(f"Snapshot: {snapshot_timestamp}")
    print(f"Location: {snapshot_dir}")
    print(f"Namespaces backed up: {len(backups)}")
    print(f"Total vectors: {manifest['total_vectors']}")
    print(f"\nManifest: {manifest_file}")

    print(f"\n✅ Backup complete")
    print(f"\nRollback instructions:")
    print(f"  1. Review backup: cat {manifest_file}")
    print(f"  2. List IDs: cat {snapshot_dir}/<namespace>.json | jq '.vector_ids'")
    print(f"  3. To restore, use Pinecone API with backed up IDs and metadata")

    sys.exit(0)

if __name__ == "__main__":
    main()
