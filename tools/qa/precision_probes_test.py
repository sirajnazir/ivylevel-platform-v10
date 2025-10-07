#!/usr/bin/env python3
"""
Precision Probes Test - Golden Query Set
Tests that KB retrieval returns relevant results for critical queries
"""
import os
import sys
import json
import time
from openai import OpenAI
from pinecone import Pinecone

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025")
NS_SESS = os.getenv("NS_SESS", "KBv6_2025-10-06_v1.0")
NS_IMSG = os.getenv("NS_IMSG", "KBv6_iMessage_2025-10-07_v1.0")
EMBED_MODEL = "text-embedding-3-large"

# Tunable thresholds
TOP1_MIN = float(os.getenv("TOP1_MIN", "0.50"))
TOP1_MIN_IMSG = float(os.getenv("TOP1_MIN_IMSG", "0.48"))
TOP3_COVERAGE = float(os.getenv("TOP3_COVERAGE", "1.00"))

def search(client_openai, idx, query, namespaces, top_k=5):
    """Embed query and search across namespaces"""
    # Get embedding
    resp = client_openai.embeddings.create(model=EMBED_MODEL, input=query)
    embedding = resp.data[0].embedding

    # Query each namespace
    results = []
    for ns in namespaces:
        res = idx.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=ns
        )
        for match in res.matches:
            results.append({
                'namespace': ns,
                'score': match.score,
                'type': match.metadata.get('type', ''),
                'chip_id': match.metadata.get('chip_id', ''),
                'week': match.metadata.get('week', '?'),
                'content_preview': match.metadata.get('content', match.metadata.get('text', ''))[:100]
            })

    # Sort by score descending
    results.sort(key=lambda x: x['score'], reverse=True)
    return results

def main():
    if not PINECONE_API_KEY or not OPENAI_API_KEY:
        print("❌ Missing required API keys (PINECONE_API_KEY, OPENAI_API_KEY)")
        sys.exit(1)

    print("🎯 Precision Probes Test\n")

    # Initialize clients
    client_openai = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(PINECONE_INDEX)

    # Load probes
    probes_path = os.path.join(os.path.dirname(__file__), "precision_probes.json")
    with open(probes_path, 'r') as f:
        probes = json.load(f)

    # Run probes
    results = []
    ok_top1 = 0
    ok_top3 = 0

    for i, probe in enumerate(probes, 1):
        q = probe['q']
        expect = probe['expect']
        ns_type = probe['ns']

        # Map namespace type to actual namespace
        namespaces = [NS_SESS] if ns_type == "sessions" else [NS_IMSG]

        print(f"\n{'='*80}")
        print(f"Probe {i}/{len(probes)}: {q}")
        print(f"Expected types: {expect}")
        print(f"Namespace: {ns_type}")

        # Search
        hits = search(client_openai, idx, q, namespaces, top_k=3)

        # Analyze results
        top1 = hits[0] if hits else None
        top3_types = [h['type'] for h in hits]

        # Check if any expected type appears in top-3
        any_expected = any(
            any(exp.lower() in t.lower() for t in top3_types)
            for exp in expect
        )

        # Check top-1 score (use family-specific threshold)
        threshold = TOP1_MIN_IMSG if ns_type == "imsg" else TOP1_MIN
        top1_good = top1 and top1['score'] >= threshold

        if top1_good:
            ok_top1 += 1
        if any_expected:
            ok_top3 += 1

        # Display results
        print(f"\nTop-3 Results:")
        for j, hit in enumerate(hits, 1):
            icon = "✅" if j == 1 and top1_good else "  "
            print(f"  {icon} #{j}: {hit['chip_id']} (type={hit['type']}, score={hit['score']:.3f}, week={hit['week']})")
            print(f"       {hit['content_preview']}...")

        print(f"\n✓/✗ Analysis:")
        top1_score_str = f"{top1['score']:.3f}" if top1 else "N/A"
        threshold_str = TOP1_MIN_IMSG if ns_type == "imsg" else TOP1_MIN
        print(f"  {'✅' if top1_good else '❌'} Top-1 score ≥ {threshold_str}: {top1_score_str}")
        print(f"  {'✅' if any_expected else '❌'} Expected type in Top-3: {any_expected}")

        # Store result
        results.append({
            'query': q,
            'expected_types': expect,
            'namespace': ns_type,
            'top1_score': top1['score'] if top1 else 0.0,
            'top1_type': top1['type'] if top1 else '',
            'top3_types': top3_types,
            'top1_pass': top1_good,
            'top3_pass': any_expected,
            'hits': hits
        })

        # Rate limit
        time.sleep(0.5)

    # Summary
    print("\n" + "="*80)
    print("📊 PRECISION PROBES SUMMARY")
    print("="*80)
    print(f"Total Probes: {len(probes)}")
    print(f"Top-1 Score ≥ 0.50: {ok_top1}/{len(probes)} ({ok_top1/len(probes)*100:.1f}%)")
    print(f"Top-3 Contains Expected: {ok_top3}/{len(probes)} ({ok_top3/len(probes)*100:.1f}%)")

    # Pass criteria (70% for top-1, configurable top-3 coverage)
    top1_threshold = 0.70
    top3_threshold = TOP3_COVERAGE

    top1_pass = (ok_top1 / len(probes)) >= top1_threshold
    top3_pass = (ok_top3 / len(probes)) >= top3_threshold

    print(f"\n✓/✗ Pass Criteria:")
    print(f"  {'✅' if top1_pass else '❌'} Top-1 ≥ 0.50 on ≥ 70% probes: {ok_top1/len(probes)*100:.1f}%")
    print(f"  {'✅' if top3_pass else '❌'} Top-3 coverage 100%: {ok_top3/len(probes)*100:.1f}%")

    # Save detailed report
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'total_probes': len(probes),
        'top1_pass_count': ok_top1,
        'top3_pass_count': ok_top3,
        'top1_pass_rate': ok_top1 / len(probes),
        'top3_pass_rate': ok_top3 / len(probes),
        'pass_criteria': {
            'top1_threshold': top1_threshold,
            'top3_threshold': top3_threshold,
            'top1_pass': top1_pass,
            'top3_pass': top3_pass
        },
        'probes': results
    }

    report_path = f"data/kb_intel_chips/qa_runs/precision_probes_{time.strftime('%Y%m%d_%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\n📝 Detailed report saved: {report_path}")

    if top1_pass and top3_pass:
        print("\n✅ PASS: Precision probes passed all criteria")
        sys.exit(0)
    else:
        print("\n❌ FAIL: Precision probes did not meet criteria")
        sys.exit(1)

if __name__ == "__main__":
    main()
