#!/usr/bin/env python3
"""
v5.4 KB Query Tool - FAISS + Pinecone support
"""

import sys
import json
import os
import numpy as np
import faiss
from dotenv import load_dotenv
from pinecone import Pinecone

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

load_dotenv()

FAISS_INDEX = "artifacts/kb/faiss_v54.index"
FAISS_MAP = "artifacts/kb/faiss_v54_map.json"

def query_faiss(q, top_k=10):
    """Query FAISS index."""
    if not os.path.exists(FAISS_INDEX):
        print(f"❌ FAISS index not found: {FAISS_INDEX}")
        return

    idx = faiss.read_index(FAISS_INDEX)
    mapping = json.load(open(FAISS_MAP, "r", encoding="utf-8"))

    qv = embed_texts([q]).astype("float32")
    faiss.normalize_L2(qv)

    D, I = idx.search(qv, top_k)

    print(f"🔍 FAISS Results (top {top_k}):")
    for r, i in enumerate(I[0], 1):
        if i < len(mapping):
            meta = mapping[i]
            print(f"  {r}. {meta['chip_id'][:16]}... [{meta.get('chip_type', 'unknown')}] (score={D[0][r-1]:.3f})")
        else:
            print(f"  {r}. Invalid index: {i}")

def query_pinecone(q, top_k=10):
    """Query Pinecone index."""
    pc_api = os.getenv("PINECONE_API_KEY")
    if not pc_api:
        print("❌ PINECONE_API_KEY not set")
        return

    pc = Pinecone(api_key=pc_api)
    index_name = os.getenv("PINECONE_INDEX_NAME", "ivylevel-kb")
    namespace = os.getenv("PINECONE_NAMESPACE_GREEN", "kb_v5_4")

    try:
        index = pc.Index(index_name)
    except Exception as e:
        print(f"❌ Failed to connect to Pinecone: {e}")
        return

    vec = embed_texts([q])[0].tolist()
    res = index.query(
        vector=vec,
        namespace=namespace,
        top_k=top_k,
        include_metadata=True
    )

    print(f"\n🔍 Pinecone Results (namespace={namespace}, top {top_k}):")
    for i, m in enumerate(res.matches, 1):
        chip_type = m.metadata.get('chip_type', 'unknown')
        framework = m.metadata.get('framework', '')
        award = m.metadata.get('award', '')
        context = f"{framework or award or ''}"
        print(f"  {r}. {m.id[:16]}... [{chip_type}] {context} (score={m.score:.3f})")

def main():
    if len(sys.argv) < 2:
        print("Usage: python query_kb_v54.py '<query>' [--faiss|--pinecone|--both]")
        print("Example: python query_kb_v54.py 'show me the 168 framework'")
        sys.exit(1)

    q = " ".join(sys.argv[1:])
    mode = "--both"  # default

    # Parse mode flag
    if "--faiss" in sys.argv:
        mode = "--faiss"
        q = q.replace("--faiss", "").strip()
    elif "--pinecone" in sys.argv:
        mode = "--pinecone"
        q = q.replace("--pinecone", "").strip()
    elif "--both" in sys.argv:
        q = q.replace("--both", "").strip()

    print(f"Query: {q}")
    print("=" * 60)

    if mode in ("--faiss", "--both"):
        try:
            query_faiss(q)
        except Exception as e:
            print(f"❌ FAISS query failed: {e}")

    if mode in ("--pinecone", "--both"):
        try:
            query_pinecone(q)
        except Exception as e:
            print(f"❌ Pinecone query failed: {e}")

if __name__ == "__main__":
    main()
