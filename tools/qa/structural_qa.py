#!/usr/bin/env python3
"""
Structural QA Checks
- Duplicate ID detection across namespaces
- Structure-like content outliers (JSON-ish instead of prose)
- Conflict detection (same week/topic, contradictory claims)
"""
import os
import sys
import json
import re
from collections import Counter, defaultdict
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")

def list_ids(idx, namespace, limit=10000):
    """List all vector IDs in a namespace"""
    ids = []
    pagination_token = None

    while True:
        if pagination_token:
            response = idx.list(namespace=namespace, limit=100, pagination_token=pagination_token)
        else:
            response = idx.list(namespace=namespace, limit=100, prefix="")

        # list() returns ID strings directly
        batch = list(response)
        ids.extend(batch)

        if not hasattr(response, 'pagination') or not response.pagination or not response.pagination.next:
            break

        pagination_token = response.pagination.next

        if len(ids) >= limit:
            break

    return ids

def check_duplicate_ids(idx):
    """Check for duplicate vector IDs across namespaces"""
    print("\n" + "="*80)
    print("🔍 Duplicate ID Check")
    print("="*80)

    print(f"Fetching IDs from {NS_SESS}...")
    ids_sess = set(list_ids(idx, NS_SESS))
    print(f"  Found {len(ids_sess)} IDs")

    print(f"Fetching IDs from {NS_IMSG}...")
    ids_imsg = set(list_ids(idx, NS_IMSG))
    print(f"  Found {len(ids_imsg)} IDs")

    # Check for cross-namespace duplicates
    duplicates = ids_sess & ids_imsg

    if duplicates:
        print(f"\n❌ FAIL: Found {len(duplicates)} duplicate IDs across namespaces")
        print(f"Examples: {list(duplicates)[:10]}")
        return False
    else:
        print(f"\n✅ PASS: No cross-namespace ID collisions")
        return True

def score_structure_like(text):
    """Heuristic to detect JSON-like structure vs natural prose"""
    if not text:
        return 0.0

    # Count structural characters
    braces = text.count('{') + text.count('}') + text.count(':')
    brackets = text.count('[') + text.count(']')
    quotes = text.count('"')

    # Count letters
    letters = sum(1 for ch in text if ch.isalpha())

    # Heuristic ratio
    structure_chars = braces + brackets + quotes
    return structure_chars / (letters + 1)

def check_outliers(idx, namespace, threshold=0.015, sample_limit=1000):
    """Check for structure-like content outliers"""
    print(f"\n🔍 Checking outliers in {namespace}...")

    ids = list_ids(idx, namespace, limit=sample_limit)
    print(f"  Sampling {len(ids)} vectors...")

    outliers = []
    for i, vec_id in enumerate(ids):
        if i % 100 == 0:
            print(f"  Progress: {i}/{len(ids)}...", end='\r')

        vec = idx.fetch([vec_id], namespace=namespace)
        if not vec.vectors:
            continue

        md = vec.vectors[vec_id].metadata
        content = md.get('content', md.get('text', ''))

        score = score_structure_like(content)
        if score > threshold:
            outliers.append({
                'id': vec_id,
                'score': score,
                'preview': content[:100]
            })

    print(f"  Progress: {len(ids)}/{len(ids)}... Done!")

    outlier_rate = len(outliers) / len(ids) if ids else 0
    print(f"\n  Structure-like outliers: {len(outliers)}/{len(ids)} ({outlier_rate*100:.2f}%)")

    if outliers[:5]:
        print(f"  Examples:")
        for out in outliers[:5]:
            print(f"    - {out['id']} (score={out['score']:.4f}): {out['preview']}...")

    return outlier_rate < 0.02  # Pass if < 2%

def check_polarity_conflicts(idx, namespace, sample_limit=1000):
    """Check for contradictory claims within same week/type groups"""
    print(f"\n🔍 Checking polarity conflicts in {namespace}...")

    ids = list_ids(idx, namespace, limit=sample_limit)
    print(f"  Sampling {len(ids)} vectors...")

    # Group by (week, type)
    groups = defaultdict(list)

    for i, vec_id in enumerate(ids):
        if i % 100 == 0:
            print(f"  Progress: {i}/{len(ids)}...", end='\r')

        vec = idx.fetch([vec_id], namespace=namespace)
        if not vec.vectors:
            continue

        md = vec.vectors[vec_id].metadata
        week = md.get('week', '?')
        chip_type = md.get('type', '?')
        content = md.get('content', md.get('text', ''))

        key = (week, chip_type)
        groups[key].append({
            'id': vec_id,
            'content': content
        })

    print(f"  Progress: {len(ids)}/{len(ids)}... Done!")

    # Simple polarity heuristic
    def polarity(text):
        if not text:
            return 0
        text_lower = text.lower()
        neg = text_lower.count('never') + text_lower.count('avoid') + text_lower.count('don\'t')
        pos = text_lower.count('always') + text_lower.count('must') + text_lower.count('should')
        return pos - neg

    # Find groups with high polarity divergence
    suspicious = []
    for key, items in groups.items():
        if len(items) < 2:
            continue

        polarities = [polarity(item['content']) for item in items]
        if max(polarities) - min(polarities) >= 3:  # Divergence threshold
            suspicious.append({
                'group': key,
                'count': len(items),
                'polarity_range': (min(polarities), max(polarities))
            })

    print(f"\n  Potential conflict groups: {len(suspicious)}")
    if suspicious[:5]:
        print(f"  Examples:")
        for s in suspicious[:5]:
            print(f"    - Week={s['group'][0]}, Type={s['group'][1]}: {s['count']} chips, polarity range {s['polarity_range']}")

    # This is informational, not a hard pass/fail
    return True

def main():
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print("🔍 Structural QA Checks\n")

    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    # Run checks
    check1 = check_duplicate_ids(idx)

    print("\n" + "="*80)
    print("🔍 Outlier Detection")
    print("="*80)
    check2 = check_outliers(idx, NS_SESS)
    check3 = check_outliers(idx, NS_IMSG)

    print("\n" + "="*80)
    print("🔍 Polarity Conflict Detection")
    print("="*80)
    check4 = check_polarity_conflicts(idx, NS_SESS)

    # Summary
    print("\n" + "="*80)
    print("📊 STRUCTURAL QA SUMMARY")
    print("="*80)
    print(f"  {'✅' if check1 else '❌'} No duplicate IDs across namespaces")
    print(f"  {'✅' if check2 else '❌'} Sessions outliers < 2%")
    print(f"  {'✅' if check3 else '❌'} iMessage outliers < 2%")
    print(f"  {'✅' if check4 else '❌'} Polarity conflict check (informational)")

    if check1 and check2 and check3:
        print("\n✅ PASS: All structural QA checks passed")
        sys.exit(0)
    else:
        print("\n❌ FAIL: Some structural QA checks failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
