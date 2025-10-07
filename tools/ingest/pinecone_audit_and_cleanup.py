#!/usr/bin/env python3
import os, sys, json, argparse, time
from typing import List
from dotenv import load_dotenv
from pinecone import Pinecone
from tenacity import retry, stop_after_attempt, wait_exponential

# Local embed helper from your repo
sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

GOLD_QUERIES = [
    # acceptance criteria: these should retrieve relevant coaching chips
    "how did Jenny help me win NCWIT?",
    "show the 168-hour framework steps",
    "plan to scale Empowering AI users",
    "what to do during SAT crisis week"
]

def env(name: str, default=None):
    v = os.getenv(name, default)
    if v is None:
        print(f"[ERROR] Missing env: {name}")
        sys.exit(1)
    return v

def describe_index(pc: Pinecone, index_name: str):
    idx = pc.Index(index_name)
    try:
        stats = idx.describe_index_stats()
        # Example shape: {'dimension': 3072, 'namespaces': {'kb_v5_4': {'vector_count': 781}, ...}}
        return stats
    except Exception as e:
        print(f"[WARN] describe_index_stats failed: {e}")
        return {}

def print_namespace_summary(stats: dict):
    ns = stats.get("namespaces", {}) if isinstance(stats, dict) else {}
    dim = stats.get("dimension")
    print(f"\n[INDEX] dimension={dim}")
    if not ns:
        print("No namespaces found.")
        return
    for k, v in ns.items():
        print(f" - {k}: {v.get('vector_count', 0)} vectors")

def sample_query(pc: Pinecone, index_name: str, namespace: str, q: str, top_k=10):
    idx = pc.Index(index_name)
    vec = embed_texts([q])[0].tolist()
    res = idx.query(
        vector=vec,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace
    )
    return res.matches

def quality_probe(pc: Pinecone, index_name: str, namespace: str):
    """A tiny smoke test: check whether gold queries retrieve anything plausibly relevant."""
    hits = 0
    total = len(GOLD_QUERIES)
    print(f"\n[QUALITY] namespace={namespace}")
    for q in GOLD_QUERIES:
        try:
            matches = sample_query(pc, index_name, namespace, q, top_k=8)
        except Exception as e:
            print(f"  {q} → ERROR: {e}")
            continue
        ok = False
        for m in matches:
            meta = m.metadata or {}
            # Heuristics: look for expected signals
            fw = (meta.get("framework") or "").lower()
            award = (meta.get("award") or "").lower()
            chip_type = (meta.get("chip_type") or "").lower()
            text_hint = (fw + " " + award + " " + chip_type)
            if any(key in text_hint for key in ["168", "ncwit", "tactic", "micro_moment", "jtbd"]):
                ok = True
                break
        print(f"  {q} → {'PASS' if ok else 'MISS'}  (top {len(matches)})")
        hits += 1 if ok else 0
    print(f"  Hit@{8}: {hits}/{total}")
    return hits, total

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def delete_namespace(pc: Pinecone, index_name: str, namespace: str):
    idx = pc.Index(index_name)
    print(f"[DELETE] Deleting namespace '{namespace}' from index '{index_name}'...")
    # Pinecone v3 signature
    idx.delete(namespace=namespace, delete_all=True)
    print("[DELETE] Done.")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
def delete_index(pc: Pinecone, index_name: str):
    print(f"[DELETE] Deleting entire index '{index_name}' ...")
    pc.delete_index(index_name)
    print("[DELETE] Done.")

def show_samples(pc: Pinecone, index_name: str, namespace: str, query: str):
    print(f"\n[SAMPLE] {namespace} ← '{query}'")
    matches = sample_query(pc, index_name, namespace, query, top_k=5)
    for i, m in enumerate(matches, 1):
        meta = m.metadata or {}
        print(f" {i}. id={m.id} score={m.score:.3f} chip_type={meta.get('chip_type')} "
              f"fw={meta.get('framework')} award={meta.get('award')} phase={meta.get('phase')} week={meta.get('week')}")

def main():
    load_dotenv()
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", required=True, choices=["audit","delete-namespace","delete-index"])
    parser.add_argument("--namespace", help="namespace to delete when mode=delete-namespace")
    args = parser.parse_args()

    index_name = env("PINECONE_INDEX_NAME")
    blue_ns = os.getenv("PINECONE_NAMESPACE_BLUE", "kb_v5_3")
    green_ns = os.getenv("PINECONE_NAMESPACE_GREEN", "kb_v5_4")

    pc = Pinecone(api_key=env("PINECONE_API_KEY"))

    if args.mode == "audit":
        print(f"[AUDIT] Index: {index_name}")
        stats = describe_index(pc, index_name)
        print_namespace_summary(stats)

        # Quality probes (only if namespace exists)
        namespaces = (stats.get("namespaces") or {}).keys()
        if green_ns in namespaces:
            quality_probe(pc, index_name, green_ns)
            show_samples(pc, index_name, green_ns, "168 framework")
            show_samples(pc, index_name, green_ns, "NCWIT award coaching")
        else:
            print(f"[INFO] No '{green_ns}' namespace yet. Export v5.4 first.")

        if blue_ns in namespaces:
            quality_probe(pc, index_name, blue_ns)
            show_samples(pc, index_name, blue_ns, "168 framework")
            show_samples(pc, index_name, blue_ns, "NCWIT award coaching")
        else:
            print(f"[INFO] No '{blue_ns}' namespace found (nothing legacy to delete).")

    elif args.mode == "delete-namespace":
        ns = args.namespace or blue_ns
        confirm = input(f"Type 'DELETE {index_name}/{ns}' to confirm: ")
        if confirm.strip() == f"DELETE {index_name}/{ns}":
            delete_namespace(pc, index_name, ns)
        else:
            print("[ABORT] Confirmation mismatch.")
    elif args.mode == "delete-index":
        confirm = input(f"Type 'DELETE INDEX {index_name}' to confirm: ")
        if confirm.strip() == f"DELETE INDEX {index_name}":
            delete_index(pc, index_name)
        else:
            print("[ABORT] Confirmation mismatch.")

if __name__ == "__main__":
    main()
