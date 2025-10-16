#!/usr/bin/env python3
"""
KB Re-embedding Script for Pinecone
Fetches chips from PostgreSQL, embeds with text-embedding-3-large, and uploads to Pinecone.

Usage:
  export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ivylevel
  export OPENAI_API_KEY=...
  export OPENAI_EMBED_MODEL=text-embedding-3-large
  export PINECONE_API_KEY=...
  export PINECONE_INDEX_NAME=jenny-v3-3072-093025
  export PINECONE_NAMESPACE=kb_v5_5_e3l
  python3 scripts/reembed_to_pinecone.py
"""

import os
import sys
import psycopg
from psycopg.rows import dict_row
from pinecone import Pinecone
from typing import Dict, Any, List
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI

DB = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ivylevel")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v5_5_e3l")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = int(os.getenv("EMBED_BATCH", "64"))

def fetch_chips(conn) -> List[Dict[str, Any]]:
    """Pull the canonical chip set from PostgreSQL."""
    sql = """
      SELECT
        chip_id,
        student_id,
        chip_type,
        COALESCE(NULLIF(text, ''), '') AS text,
        source_kind,
        phase,
        week,
        chip_date,
        award,
        activity,
        framework,
        confidence,
        tags
      FROM kb_chips
      WHERE text IS NOT NULL AND text <> ''
      ORDER BY chip_id
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()

def clean_meta(r: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize metadata - remove nulls and empties."""
    meta = {
        "chip_type": r["chip_type"],
        "student_id": r["student_id"],
        "kb_schema_version": "5.5",
    }
    # Add only non-null, non-empty values
    if r.get("source_kind"): meta["source_kind"] = r["source_kind"]
    if r.get("phase"): meta["phase"] = r["phase"]
    if r.get("week"): meta["week"] = r["week"]
    if r.get("chip_date"): meta["date"] = str(r["chip_date"])
    if r.get("award"): meta["award"] = r["award"]
    if r.get("activity"): meta["activity"] = r["activity"]
    if r.get("framework"): meta["framework"] = r["framework"]
    if r.get("tags"): meta["tags"] = r["tags"] if isinstance(r["tags"], list) else []
    if r.get("confidence") is not None:
        try:
            meta["confidence"] = float(r["confidence"])
        except:
            pass
    return meta

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30))
def upsert_batch(index, vectors, namespace):
    """Upsert a batch of vectors with retry logic."""
    index.upsert(vectors=vectors, namespace=namespace)

def embed_batch(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using OpenAI."""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]

def main():
    # Validate environment
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not os.getenv("PINECONE_API_KEY"):
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 Re-embedding KB chips to Pinecone")
    print(f"   Database: {DB}")
    print(f"   Index: {INDEX_NAME}")
    print(f"   Namespace: {NAMESPACE}")
    print(f"   Embedding Model: {EMBED_MODEL}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print()

    # Initialize clients
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    index = pc.Index(INDEX_NAME)

    # Fetch chips from database
    with psycopg.connect(DB, row_factory=dict_row) as conn:
        rows = fetch_chips(conn)
        total = len(rows)
        print(f"📊 Found {total} chips to embed")

        if total == 0:
            print("⚠️  No chips found in kb_chips table")
            return

        buf_ids, buf_texts, buf_metas = [], [], []
        done = 0

        for r in rows:
            txt = r["text"].strip()
            if not txt:
                continue

            buf_ids.append(r["chip_id"])
            buf_texts.append(txt)
            buf_metas.append(clean_meta(r))

            if len(buf_texts) >= BATCH_SIZE:
                # Embed and upsert batch
                embs = embed_batch(client, buf_texts)
                vectors = [
                    {"id": i, "values": e, "metadata": m}
                    for i, e, m in zip(buf_ids, embs, buf_metas)
                ]
                upsert_batch(index, vectors, NAMESPACE)
                done += len(vectors)
                print(f"  ✅ Upserted {done}/{total} chips")
                buf_ids, buf_texts, buf_metas = [], [], []

        # Handle remaining chips
        if buf_texts:
            embs = embed_batch(client, buf_texts)
            vectors = [
                {"id": i, "values": e, "metadata": m}
                for i, e, m in zip(buf_ids, embs, buf_metas)
            ]
            upsert_batch(index, vectors, NAMESPACE)
            done += len(vectors)
            print(f"  ✅ Upserted {done}/{total} chips")

        print()
        print(f"✅ Re-embed + upsert complete!")
        print(f"   Total chips embedded: {done}")
        print(f"   Namespace: {NAMESPACE}")

        # Show final stats
        try:
            stats = index.describe_index_stats()
            ns_count = stats.get("namespaces", {}).get(NAMESPACE, {}).get("vector_count", 0)
            print(f"   Vectors in namespace: {ns_count}")
        except Exception as e:
            print(f"⚠️  Could not get final stats: {e}")

if __name__ == "__main__":
    main()
