#!/usr/bin/env python3
"""
Deployment Version Check
Validates that current deployment matches the expected manifest
"""
import os
import sys
import json
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")

MANIFEST_PATH = "tools/qa/deployment_manifest.json"

def load_manifest():
    """Load deployment manifest"""
    with open(MANIFEST_PATH, 'r') as f:
        return json.load(f)

def check_namespace_version(manifest_ns, actual_ns, stats):
    """Check if namespace matches manifest"""
    errors = []

    # Check name
    if manifest_ns['name'] != actual_ns:
        errors.append(f"Namespace name mismatch: expected {manifest_ns['name']}, got {actual_ns}")

    # Check vector count (allow small drift)
    expected_count = manifest_ns['vector_count']
    actual_count = stats.namespaces.get(actual_ns, {}).get('vector_count', 0)

    drift = abs(actual_count - expected_count) / expected_count if expected_count > 0 else 0

    if drift > 0.05:  # 5% tolerance
        errors.append(f"Vector count drift: expected {expected_count}, got {actual_count} (drift: {drift*100:.1f}%)")

    return errors, actual_count

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print("🏷️  Deployment Version Check\n")

    # Load manifest
    try:
        manifest = load_manifest()
    except FileNotFoundError:
        print(f"❌ Manifest not found: {MANIFEST_PATH}")
        sys.exit(1)

    print(f"📋 Expected Deployment (version {manifest['version']}):")
    print(f"   Date: {manifest['deployment_date']}")
    print(f"   Index: {manifest['pinecone_index']}")
    print(f"   Schema: v{manifest['schema_version']}")

    # Get current state
    pc = Pinecone(api_key=PINECONE_API_KEY)

    # Check index name
    if PINECONE_INDEX != manifest['pinecone_index']:
        print(f"\n❌ FAIL: Index mismatch")
        print(f"   Expected: {manifest['pinecone_index']}")
        print(f"   Got: {PINECONE_INDEX}")
        sys.exit(1)

    idx = pc.Index(PINECONE_INDEX)
    stats = idx.describe_index_stats()

    # Check sessions+exec namespace
    print(f"\n{'='*80}")
    print("Sessions+Exec Namespace")
    print(f"{'='*80}")

    sess_manifest = manifest['expected_namespaces']['sessions_exec']
    sess_errors, sess_count = check_namespace_version(sess_manifest, NS_SESS, stats)

    print(f"Expected: {sess_manifest['name']}")
    print(f"Actual:   {NS_SESS}")
    print(f"Vector Count: {sess_count} (expected {sess_manifest['vector_count']})")
    print(f"Families: {', '.join(sess_manifest['chip_families'])}")
    print(f"Embedding: {sess_manifest['embedding_model']} ({sess_manifest['embedding_dim']}d, {sess_manifest['metric']})")

    if sess_errors:
        print(f"\n❌ Errors:")
        for err in sess_errors:
            print(f"  - {err}")
    else:
        print(f"\n✅ Sessions+Exec namespace matches manifest")

    # Check iMessage namespace
    print(f"\n{'='*80}")
    print("iMessage Namespace")
    print(f"{'='*80}")

    imsg_manifest = manifest['expected_namespaces']['imessage']
    imsg_errors, imsg_count = check_namespace_version(imsg_manifest, NS_IMSG, stats)

    print(f"Expected: {imsg_manifest['name']}")
    print(f"Actual:   {NS_IMSG}")
    print(f"Vector Count: {imsg_count} (expected {imsg_manifest['vector_count']})")
    print(f"Families: {', '.join(imsg_manifest['chip_families'])}")
    print(f"Embedding: {imsg_manifest['embedding_model']} ({imsg_manifest['embedding_dim']}d, {imsg_manifest['metric']})")

    if imsg_errors:
        print(f"\n❌ Errors:")
        for err in imsg_errors:
            print(f"  - {err}")
    else:
        print(f"\n✅ iMessage namespace matches manifest")

    # Summary
    print(f"\n{'='*80}")
    print("📊 DEPLOYMENT VERSION SUMMARY")
    print(f"{'='*80}")

    all_errors = sess_errors + imsg_errors

    if not all_errors:
        print(f"✅ PASS: Deployment matches manifest v{manifest['version']}")
        print(f"\nNamespaces:")
        print(f"  - {NS_SESS}: {sess_count} vectors")
        print(f"  - {NS_IMSG}: {imsg_count} vectors")
        print(f"\nLast validated: {manifest['last_validated']}")
        sys.exit(0)
    else:
        print(f"❌ FAIL: Deployment does not match manifest")
        print(f"\nTotal errors: {len(all_errors)}")
        print(f"\nAction required:")
        print(f"  1. Verify namespace names in environment")
        print(f"  2. Check for unexpected re-embeds or deletions")
        print(f"  3. Update manifest if deployment has changed:")
        print(f"     - Edit {MANIFEST_PATH}")
        print(f"     - Update version, vector_count, and last_validated")
        sys.exit(1)

if __name__ == "__main__":
    main()
