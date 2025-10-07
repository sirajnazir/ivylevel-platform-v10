#!/usr/bin/env python3
# Template embed script; wire this into your existing pipeline.
# env: PINECONE_INDEX, NAMESPACE (e.g., KBv6_Assessment_2025-10-07_v1.0), EMBED_MODEL
import os, sys, json
def load_jsonl(p):
    with open(p,'r',encoding='utf-8') as f:
        return [json.loads(x) for x in f if x.strip()]
def main():
    files=sys.argv[1:]
    if not files:
        print("usage: embed_assess_chips.py file1.jsonl [file2.jsonl ...]"); return
    total=0
    ns=os.environ.get("NAMESPACE","KBv6_Assessment_2025-10-07_v1.0")
    idx=os.environ.get("PINECONE_INDEX","jenny-v3-3072-093025")
    model=os.environ.get("EMBED_MODEL","text-embedding-3-large")
    print("[DRY-RUN] would embed into index=%s namespace=%s model=%s" % (idx, ns, model))
    for p in files:
        n=len(load_jsonl(p)); total+=n
        print("  - %s: %d vectors" % (p, n))
    print("TOTAL: %d vectors" % total)
if __name__=='__main__': main()
