#!/usr/bin/env python3
"""
v5.4 Quality Gates - Golden Query Evaluation
Tests KB retrieval quality with known queries
"""

import sys
import os
from dotenv import load_dotenv
from pinecone import Pinecone

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

load_dotenv()

# Golden queries with expected signals
GOLD_QUERIES = [
    {
        "query": "how did Jenny help me win NCWIT?",
        "expected": {"award": "NCWIT", "chip_type": ["tactic", "success_path", "micro_moment"]}
    },
    {
        "query": "show the 168-hour framework steps",
        "expected": {"framework": "168", "chip_type": ["framework", "tactic"]}
    },
    {
        "query": "plan to scale Empowering AI users",
        "expected": {"activity": "Empowering AI", "chip_type": ["tactic", "success_path"]}
    },
    {
        "query": "what to do during SAT crisis week",
        "expected": {"chip_type": ["tactic", "micro_moment", "jtbd"]}
    },
]

def evaluate_pinecone(namespace="kb_v5_4", top_k=10):
    """Run evaluation against Pinecone index."""
    pc_api = os.getenv("PINECONE_API_KEY")
    if not pc_api:
        print("❌ PINECONE_API_KEY not set. Skipping Pinecone evaluation.")
        return

    pc = Pinecone(api_key=pc_api)
    index_name = os.getenv("PINECONE_INDEX_NAME", "ivylevel-kb")

    try:
        index = pc.Index(index_name)
    except Exception as e:
        print(f"❌ Failed to connect to Pinecone: {e}")
        return

    print(f"🎯 Running Quality Gates (Pinecone, namespace={namespace})")
    print("=" * 60)

    hits = 0
    total = len(GOLD_QUERIES)

    for i, gold in enumerate(GOLD_QUERIES, 1):
        q = gold["query"]
        expected = gold["expected"]

        vec = embed_texts([q])[0].tolist()
        res = index.query(
            vector=vec,
            namespace=namespace,
            top_k=top_k,
            include_metadata=True
        )

        # Check if expected signals are in top results
        found = False
        for m in res.matches:
            meta = m.metadata
            match = True

            # Check award
            if "award" in expected:
                if expected["award"].lower() not in (meta.get("award") or "").lower():
                    match = False

            # Check framework
            if "framework" in expected:
                if expected["framework"] not in (meta.get("framework") or ""):
                    match = False

            # Check activity
            if "activity" in expected:
                if expected["activity"].lower() not in (meta.get("activity") or "").lower():
                    match = False

            # Check chip type
            if "chip_type" in expected:
                if meta.get("chip_type") not in expected["chip_type"]:
                    match = False

            if match:
                found = True
                break

        status = "✅ PASS" if found else "❌ MISS"
        hits += 1 if found else 0

        print(f"{i}. {q}")
        print(f"   Expected: {expected}")
        print(f"   {status}")

        if not found and res.matches:
            print(f"   Top result: [{res.matches[0].metadata.get('chip_type')}] score={res.matches[0].score:.3f}")
        print()

    print("=" * 60)
    print(f"📊 Results: {hits}/{total} queries passed ({(hits/total*100):.1f}%)")
    print(f"🎯 Target: 100% (all queries should hit expected signals)")

    if hits == total:
        print("✅ All quality gates passed!")
    else:
        print("⚠️  Some quality gates failed. Review chip extraction or metadata.")

def main():
    namespace = os.getenv("PINECONE_NAMESPACE_GREEN", "kb_v5_4")
    evaluate_pinecone(namespace=namespace)

if __name__ == "__main__":
    main()
