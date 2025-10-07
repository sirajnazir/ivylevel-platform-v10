#!/usr/bin/env python3
import os, random, sys
from pinecone import Pinecone
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
idx = pc.Index(os.getenv("PINECONE_INDEX_NAME","jenny-v3-3072-093025"))
ns = os.getenv("PINECONE_NAMESPACE","kb_v5_4")

# pull random by facet to eyeball quality
FACETS = [
  ("NCWIT coaching", {"award":"NCWIT"}),
  ("168 framework", {"framework":"168"}),
  ("Empowering AI growth", {"activity":"Empowering AI"}),
  ("essay surgery", {"coach_move":"essay_surgery"})
]

print(f"📋 Sampling enriched chips from namespace: {ns}\n")

for query, f in FACETS:
    vec = embed_texts([query])[0].tolist()
    r = idx.query(namespace=ns, top_k=3, vector=vec, include_metadata=True, filter=f)
    print(f"\n{'='*60}")
    print(f"Facet: {f}")
    print(f"{'='*60}")

    if not r.matches:
        print("  ⚠️  No matches found")
        continue

    for i, m in enumerate(r.matches, 1):
        meta = m.metadata or {}
        print(f"\n{i}. ID: {m.id[:32]}...")
        print(f"   Score: {m.score:.3f}")
        print(f"   Chip Type: {meta.get('chip_type')}")
        print(f"   Award: {meta.get('award')}")
        print(f"   Activity: {meta.get('activity')}")
        print(f"   Framework: {meta.get('framework')}")
        print(f"   Coach Move: {meta.get('coach_move')}")
        print(f"   Phase: {meta.get('phase')}, Week: {meta.get('week')}")
        print(f"   Confidence: {meta.get('confidence')}")
        print(f"   Tags: {meta.get('tags')}")

print(f"\n{'='*60}")
print("✅ Sampling complete")
