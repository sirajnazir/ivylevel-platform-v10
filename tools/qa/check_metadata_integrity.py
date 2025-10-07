#!/usr/bin/env python3
"""
Random metadata spot-check (50 chips per namespace)
"""
import os
import sys
import random
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")

def sample_namespace(idx, ns, k=50):
    """Sample k random vectors and check metadata integrity"""
    print(f"\n🔍 Sampling {ns}...")

    # Fetch vector IDs (limit max 100 per API)
    # list() returns a generator of ID strings
    vector_ids = list(idx.list(namespace=ns, limit=100, prefix=""))

    if not vector_ids:
        print(f"  ⚠️  No vectors found in namespace")
        return False

    # Sample random IDs
    sample_size = min(k, len(vector_ids))
    sampled_ids = random.sample(vector_ids, sample_size)

    errors = []
    # Fetch one at a time to avoid URI limit issues
    for vec_id in sampled_ids:
        vec = idx.fetch(ids=[vec_id], namespace=ns)

        if vec_id not in vec.vectors:
            errors.append(f"  ❌ {vec_id}: Vector not found")
            continue

        md = vec.vectors[vec_id].metadata

        # Check required fields
        required_fields = ["chip_id", "type", "chip_family"]
        content_field = "content" if "content" in md else "text"

        for field in required_fields:
            if field not in md:
                errors.append(f"  ❌ {vec_id}: Missing field '{field}'")

        if content_field not in md:
            errors.append(f"  ❌ {vec_id}: Missing content/text field")

        # Check week and phase are present (can be empty for some chip types)
        if "week" not in md:
            errors.append(f"  ❌ {vec_id}: Missing 'week' field")
        if "phase" not in md:
            errors.append(f"  ❌ {vec_id}: Missing 'phase' field")

    if errors:
        print(f"  ❌ Found {len(errors)} errors in {sample_size} samples:")
        for err in errors[:10]:  # Show first 10
            print(err)
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
        return False
    else:
        print(f"  ✅ All {sample_size} samples passed integrity check")
        return True

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print("🔍 KB Metadata Integrity Check")

    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    sess_ok = sample_namespace(idx, NS_SESS, k=50)
    imsg_ok = sample_namespace(idx, NS_IMSG, k=40)  # Only 40 total

    print("\n" + "="*60)
    if sess_ok and imsg_ok:
        print("✅ PASS: All metadata integrity checks passed")
        sys.exit(0)
    else:
        print("❌ FAIL: Metadata integrity issues detected")
        sys.exit(1)

if __name__ == "__main__":
    main()
