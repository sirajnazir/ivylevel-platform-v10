#!/usr/bin/env python3
import os, json, sys
from pinecone import Pinecone
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME","jenny-v3-3072-093025"))
NS = os.getenv("PINECONE_NAMESPACE","kb_v5_4")

GOLDS = [
    {"q":"ncwit coaching steps", "must_meta":{"award":"NCWIT"}},
    {"q":"168 framework", "must_meta":{"framework":"168"}},
    {"q":"empowering ai growth tactic", "must_meta":{"activity":"Empowering AI"}},
    {"q":"essay surgery move", "must_meta":{"coach_move":"essay_surgery"}},
]

def main():
    passed = 0
    print(f"🔍 Quality Audit for namespace: {NS}\n")

    for g in GOLDS:
        # Embed query for vector search
        vec = embed_texts([g["q"]])[0].tolist()

        # Query with metadata filter
        r = index.query(
            namespace=NS,
            top_k=10,
            vector=vec,
            include_metadata=True,
            filter=g["must_meta"]
        )
        hits = len(r.matches or [])
        ok = hits > 0
        print(f"[{'PASS' if ok else 'MISS'}] {g['q']}")
        print(f"  filter={g['must_meta']}  hits={hits}")

        if r.matches:
            # Show top match
            m = r.matches[0]
            meta = m.metadata or {}
            print(f"  top match: score={m.score:.3f} {meta}")
        print()

        passed += 1 if ok else 0

    print(f"✅ Golds: {passed}/{len(GOLDS)} passed")

    if passed >= 3:
        print("✨ Quality gate PASSED - safe to promote to production")
    else:
        print("⚠️  Quality gate FAILED - enrichment needed")

if __name__ == "__main__":
    main()
