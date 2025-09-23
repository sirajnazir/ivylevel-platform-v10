import os, argparse, json, sys, time
from typing import List, Dict

def read_jsonl(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if not ln: 
                continue
            yield json.loads(ln)

def batched(iterable, n=64):
    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= n:
            yield batch
            batch = []
    if batch:
        yield batch

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jsonl", required=True, help="RAG index jsonl file")
    ap.add_argument("--index", default=os.getenv("PINECONE_INDEX", ""))
    ap.add_argument("--namespace", default=os.getenv("PINECONE_NAMESPACE", "jenny_v1"))
    args = ap.parse_args()

    try:
        from openai import OpenAI
        from pinecone import Pinecone
    except Exception as e:
        print("Please `pip install openai pinecone-client`", file=sys.stderr)
        raise

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    if not OPENAI_API_KEY or not PINECONE_API_KEY or not args.index:
        print("Missing OPENAI_API_KEY / PINECONE_API_KEY / --index", file=sys.stderr)
        sys.exit(2)

    client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx = pc.Index(args.index)

    def embed(texts: List[str]) -> List[List[float]]:
        r = client.embeddings.create(model="text-embedding-3-small", input=texts)
        return [row.embedding for row in r.data]

    total = 0
    t0 = time.time()
    for batch in batched(read_jsonl(args.jsonl), 64):
        embs = embed([b.get("text","") for b in batch])
        vectors = []
        for b, vec in zip(batch, embs):
            meta = dict(b)
            meta["text"] = b.get("text","")
            vectors.append({"id": b.get("id") or f"auto-{total}", "values": vec, "metadata": meta})
            total += 1
        idx.upsert(vectors=vectors, namespace=args.namespace)
        print(f"Upserted {len(vectors)} ... total={total}")

    print(f"Done. total={total}, took={time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()
