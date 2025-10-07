#!/usr/bin/env python3
"""
Quick vector count check for KB namespaces (4 families)
"""
import os
import sys
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")
NS_ASSESS = os.getenv("NS_ASSESS", "KBv6_Assessment_2025-10-07_v1.0")

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    stats = idx.describe_index_stats()

    sess_count = stats.namespaces.get(NS_SESS, {}).get('vector_count', 0)
    imsg_count = stats.namespaces.get(NS_IMSG, {}).get('vector_count', 0)
    assess_count = stats.namespaces.get(NS_ASSESS, {}).get('vector_count', 0)

    print(f"📊 Vector Counts:")
    print(f"  Sessions+Exec ({NS_SESS}): {sess_count}")
    print(f"  iMessage ({NS_IMSG}): {imsg_count}")
    print(f"  Assessment+GamePlan ({NS_ASSESS}): {assess_count}")

    # Check expectations
    expected_sess = 924  # 923 original + 1 W001-FRAMEWORK-168HOUR
    expected_imsg = 40
    expected_assess = 9

    sess_ok = sess_count == expected_sess
    imsg_ok = imsg_count == expected_imsg
    assess_ok = assess_count == expected_assess

    print(f"\n✓/✗ Validation:")
    print(f"  {'✅' if sess_ok else '❌'} Sessions+Exec: {sess_count} (expected {expected_sess})")
    print(f"  {'✅' if imsg_ok else '❌'} iMessage: {imsg_count} (expected {expected_imsg})")
    print(f"  {'✅' if assess_ok else '❌'} Assessment+GamePlan: {assess_count} (expected {expected_assess})")

    total_actual = sess_count + imsg_count + assess_count
    total_expected = expected_sess + expected_imsg + expected_assess
    print(f"\n  Total: {total_actual} (expected {total_expected})")

    if sess_ok and imsg_ok and assess_ok:
        print("\n✅ All counts match expectations")
        sys.exit(0)
    else:
        print("\n❌ Count mismatch detected")
        sys.exit(1)

if __name__ == "__main__":
    main()
