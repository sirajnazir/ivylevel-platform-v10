#!/usr/bin/env python3
import json, sys, os, hashlib

def fake_embed(text):
    # Deterministic small vector (16-dim) for dry-run QA
    h = hashlib.sha256(text.encode("utf-8")).digest()
    # Produce 16 floats from hash bytes
    vals = [int(h[i]) / 255.0 for i in range(16)]
    return vals

def iter_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line=line.strip()
            if not line: continue
            yield json.loads(line)

def main():
    if len(sys.argv) < 2:
        print("Usage: embed_assess_gameplan_chips.py <file1.jsonl> [file2.jsonl ...]")
        sys.exit(2)
    total = 0
    for p in sys.argv[1:]:
        for chip in iter_jsonl(p):
            vec = fake_embed(chip["content"] + " " + chip.get("insight_vector",""))
            total += 1
            print(f"Would upsert id={chip['chip_id']} dim={len(vec)} meta_phase={chip.get('source_doc',{}).get('phase')}")
    print(f"Dry-run complete. Chips counted={total}.")
    print("Wire this script to your production embedder (e.g., text-embedding-3-large → Pinecone).")

if __name__ == "__main__":
    main()
