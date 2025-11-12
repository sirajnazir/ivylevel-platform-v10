
#!/usr/bin/env python3
"""
embed_imsg_chips_v3.py

- Optionally deletes a Pinecone namespace (if --overwrite)
- Embeds iMessage v3 chips to Pinecone with text-embedding-3-large (dim=3072)
- Adds filters: chip_family="imessage", type, situation_tag, week, phase

Usage:
  python embed_imsg_chips_v3.py --input iMessage_Intel_Chips_Batch_v3.jsonl --namespace KBv6_iMessage_2025-10-07_v1.0 --overwrite
"""
import argparse, json, os, sys, time
from typing import List
try:
    from openai import OpenAI
except Exception:
    print("Please install openai>=1.0.0", file=sys.stderr)
    sys.exit(1)
try:
    from pinecone import Pinecone, ServerlessSpec
except Exception:
    print("Please install pinecone-client>=3.0.0", file=sys.stderr)
    sys.exit(1)

MODEL = "text-embedding-3-large"
DIM = 3072

def load_jsonl(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: 
                continue
            yield json.loads(line)

def embed_texts(client, texts: List[str]) -> List[List[float]]:
    # Batching for speed; simple split in chunks of 100
    embs = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i+100]
        resp = client.embeddings.create(model=MODEL, input=batch)
        embs.extend([e.embedding for e in resp.data])
    return embs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--index", default=os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025"))
    ap.add_argument("--namespace", required=True)
    ap.add_argument("--overwrite", action="store_true")
    args = ap.parse_args()

    # Init clients
    oa = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(args.index)

    if args.overwrite:
        # Delete all vectors in namespace
        try:
            index.delete(delete_all=True, namespace=args.namespace)
            print(f"Cleared namespace: {args.namespace}")
        except Exception as e:
            print(f"Warning: failed to clear namespace ({e}) — continuing")

    # Load chips
    chips = list(load_jsonl(args.input))
    print(f"Loaded {len(chips)} chips")

    # Prepare embeddings
    texts = [c.get("content","") for c in chips]
    vectors = embed_texts(oa, texts)
    assert len(vectors) == len(chips)

    # Upsert
    upserts = []
    for c, vec in zip(chips, vectors):
        meta = c.get("metadata", {}) or {}
        sd = c.get("source_doc", {}) or {}
        meta.update({
            "chip_family": "imessage",
            "type": c.get("type"),
            "situation_tag": meta.get("situation_tag",""),
            "week": str(sd.get("week","IMSG")),
            "phase": str(sd.get("phase","IMSG")),
            "filename": sd.get("filename","")
        })
        upserts.append({
            "id": c["chip_id"],
            "values": vec,
            "metadata": meta
        })

    # Pinecone upsert in chunks
    for i in range(0, len(upserts), 100):
        batch = upserts[i:i+100]
        index.upsert(vectors=batch, namespace=args.namespace)
    print(f"Upserted {len(upserts)} vectors to namespace {args.namespace}")

if __name__ == "__main__":
    main()
