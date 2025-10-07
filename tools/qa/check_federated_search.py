#!/usr/bin/env python3
"""
Federated Search Check
Tests that pooled + reranked results from multiple namespaces work correctly
and that source filters are respected
"""
import os
import sys
from openai import OpenAI
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")
EMBED_MODEL = "text-embedding-3-large"

def federated_search(client_openai, idx, query, namespaces, top_k=10):
    """Search across multiple namespaces and pool results"""
    resp = client_openai.embeddings.create(model=EMBED_MODEL, input=query)
    embedding = resp.data[0].embedding

    all_results = []
    for ns in namespaces:
        res = idx.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=ns
        )
        for match in res.matches:
            all_results.append({
                'namespace': ns,
                'chip_family': match.metadata.get('chip_family', 'unknown'),
                'chip_id': match.metadata.get('chip_id', 'N/A'),
                'type': match.metadata.get('type', '?'),
                'score': match.score
            })

    # Rerank by score
    all_results.sort(key=lambda x: x['score'], reverse=True)
    return all_results[:top_k]

def main():
    if not PINECONE_API_KEY or not OPENAI_API_KEY:
        print("❌ Missing required API keys")
        sys.exit(1)

    print("🔀 Federated Search QA Check\n")

    client_openai = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    # Test query that should hit both families
    test_query = "college application strategy framework and quick follow-up message template"

    print("="*80)
    print("Test 1: Federated Search (source=both)")
    print("="*80)
    print(f"Query: {test_query}")
    print(f"Searching across: {NS_SESS}, {NS_IMSG}")

    results_both = federated_search(client_openai, idx, test_query, [NS_SESS, NS_IMSG], top_k=10)

    print(f"\nTop-10 Federated Results:")
    families_found = set()
    for i, hit in enumerate(results_both, 1):
        families_found.add(hit['chip_family'])
        print(f"  {i}. {hit['chip_id']} (family={hit['chip_family']}, type={hit['type']}, score={hit['score']:.3f})")

    # Check that we have both families in top-10
    has_sessions = any(f in ['session', 'exec'] for f in families_found)
    has_imsg = 'imessage' in families_found

    print(f"\n✓/✗ Validation:")
    print(f"  {'✅' if has_sessions else '❌'} Sessions/Exec chips present: {has_sessions}")
    print(f"  {'✅' if has_imsg else '❌'} iMessage chips present: {has_imsg}")

    check1_pass = has_sessions and has_imsg

    # Test 2: Source filter = sessions only
    print("\n" + "="*80)
    print("Test 2: Source Filter (sessions only)")
    print("="*80)

    results_sess = federated_search(client_openai, idx, test_query, [NS_SESS], top_k=10)

    print(f"\nTop-10 Sessions-Only Results:")
    imsg_leak = False
    for i, hit in enumerate(results_sess, 1):
        print(f"  {i}. {hit['chip_id']} (family={hit['chip_family']}, score={hit['score']:.3f})")
        if hit['chip_family'] == 'imessage':
            imsg_leak = True

    print(f"\n✓/✗ Validation:")
    print(f"  {'✅' if not imsg_leak else '❌'} No iMessage chips leaked: {not imsg_leak}")

    check2_pass = not imsg_leak

    # Test 3: Source filter = imessage only
    print("\n" + "="*80)
    print("Test 3: Source Filter (iMessage only)")
    print("="*80)

    results_imsg = federated_search(client_openai, idx, test_query, [NS_IMSG], top_k=10)

    print(f"\nTop-{len(results_imsg)} iMessage-Only Results:")
    sess_leak = False
    for i, hit in enumerate(results_imsg, 1):
        print(f"  {i}. {hit['chip_id']} (family={hit['chip_family']}, score={hit['score']:.3f})")
        if hit['chip_family'] in ['session', 'exec']:
            sess_leak = True

    print(f"\n✓/✗ Validation:")
    print(f"  {'✅' if not sess_leak else '❌'} No session/exec chips leaked: {not sess_leak}")

    check3_pass = not sess_leak

    # Summary
    print("\n" + "="*80)
    print("📊 FEDERATED SEARCH SUMMARY")
    print("="*80)
    print(f"  {'✅' if check1_pass else '❌'} Federated (both): Contains both families")
    print(f"  {'✅' if check2_pass else '❌'} Sessions filter: No iMessage leaks")
    print(f"  {'✅' if check3_pass else '❌'} iMessage filter: No session/exec leaks")

    if check1_pass and check2_pass and check3_pass:
        print("\n✅ PASS: Federated search filters work correctly")
        sys.exit(0)
    else:
        print("\n❌ FAIL: Federated search has filter leaks")
        sys.exit(1)

if __name__ == "__main__":
    main()
