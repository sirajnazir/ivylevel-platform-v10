#!/usr/bin/env python3
"""
embed_assess_gameplan_chips.py

- Embeds Assessment + GamePlan chips to Pinecone with text-embedding-3-large (dim=3072)
- Adds filters: chip_family="assessment"/"gameplan", type, week, phase
- Follows same pattern as sessions/exec/imessage embedders

Usage:
  python embed_assess_gameplan_chips.py \
    --input data/kb_intel_chips/gameplan-chips/chips/ \
    --namespace KBv6_Assessment_2025-10-07_v1.0 \
    [--overwrite]
"""
import argparse, json, os, sys, time
from pathlib import Path
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
    """Load chips from JSONL file."""
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)

def load_chips_from_dir_or_file(input_path: str):
    """Load chips from directory (multiple JSONL files) or single file."""
    p = Path(input_path)
    chips = []

    if p.is_dir():
        # Load all JSONL files in directory
        for jsonl_file in p.glob("*.jsonl"):
            print(f"Loading {jsonl_file.name}...")
            chips.extend(list(load_jsonl(str(jsonl_file))))
    elif p.is_file():
        chips.extend(list(load_jsonl(input_path)))
    else:
        print(f"Error: {input_path} is not a file or directory", file=sys.stderr)
        sys.exit(1)

    return chips

def embed_texts(client, texts: List[str]) -> List[List[float]]:
    """Embed texts in batches of 100."""
    embs = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i+100]
        resp = client.embeddings.create(model=MODEL, input=batch)
        embs.extend([e.embedding for e in resp.data])
    return embs

def determine_chip_family(chip_id: str) -> str:
    """Determine chip family from chip_id prefix."""
    if chip_id.startswith("ASSESS-"):
        return "assessment"
    elif chip_id.startswith("GAMEPLAN-"):
        return "gameplan"
    else:
        return "unknown"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Path to JSONL file or directory with JSONL files")
    ap.add_argument("--index", default=os.getenv("PINECONE_INDEX", "jenny-v3-3072-093025"))
    ap.add_argument("--namespace", required=True, help="Pinecone namespace (e.g., KBv6_Assessment_2025-10-07_v1.0)")
    ap.add_argument("--overwrite", action="store_true", help="Delete namespace before upserting")
    args = ap.parse_args()

    # Validate env vars
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not set", file=sys.stderr)
        sys.exit(1)
    if not os.getenv("PINECONE_API_KEY"):
        print("Error: PINECONE_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    # Init clients
    print("Initializing OpenAI and Pinecone clients...")
    oa = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index = pc.Index(args.index)

    if args.overwrite:
        # Delete all vectors in namespace
        try:
            print(f"Deleting namespace: {args.namespace}...")
            index.delete(delete_all=True, namespace=args.namespace)
            print(f"✓ Cleared namespace: {args.namespace}")
        except Exception as e:
            print(f"Warning: failed to clear namespace ({e}) — continuing")

    # Load chips
    print(f"Loading chips from {args.input}...")
    chips = load_chips_from_dir_or_file(args.input)
    print(f"✓ Loaded {len(chips)} chips")

    # Prepare embeddings (content + insight_vector for semantic richness)
    print(f"Embedding {len(chips)} chips with {MODEL} ({DIM}d)...")
    texts = [c.get("content", "") + " " + c.get("insight_vector", "") for c in chips]
    vectors = embed_texts(oa, texts)
    assert len(vectors) == len(chips), "Vector count mismatch"
    print(f"✓ Generated {len(vectors)} embeddings")

    # Upsert
    print("Preparing metadata and upserting to Pinecone...")
    upserts = []
    for c, vec in zip(chips, vectors):
        meta = c.get("metadata", {}) or {}
        sd = c.get("source_doc", {}) or {}
        chip_family = determine_chip_family(c["chip_id"])

        meta.update({
            "chip_family": chip_family,
            "type": c.get("type", ""),
            "week": str(sd.get("week", "000")),
            "phase": str(sd.get("phase", "FOUNDATION")),
            "filename": sd.get("filename", ""),
            # Keep original metadata fields
            "participants": ",".join(meta.get("participants", [])),
            "quality_score": meta.get("quality_score", 0.0),
            "confidence_score": meta.get("confidence_score", 0.0)
        })

        upserts.append({
            "id": c["chip_id"],
            "values": vec,
            "metadata": meta
        })

    # Pinecone upsert in chunks of 100
    for i in range(0, len(upserts), 100):
        batch = upserts[i:i+100]
        index.upsert(vectors=batch, namespace=args.namespace)
        print(f"  Upserted batch {i//100 + 1}/{(len(upserts)-1)//100 + 1}")

    print(f"\n✓ Successfully upserted {len(upserts)} vectors to namespace {args.namespace}")
    print(f"  Index: {args.index}")
    print(f"  Model: {MODEL} ({DIM}d)")
    print(f"  Chip families: {set(determine_chip_family(c['chip_id']) for c in chips)}")

if __name__ == "__main__":
    main()
