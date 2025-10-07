#!/usr/bin/env python3
"""
Pinecone Exporter for v5.4 - Blue/Green Migration
Exports chips from Postgres to Pinecone with metadata filtering support
"""

import os
import json
import time
import sys
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from tenacity import retry, stop_after_attempt, wait_exponential

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))
from embed_openai import embed_texts

load_dotenv()

DB = os.getenv("DATABASE_URL")
PC_API = os.getenv("PINECONE_API_KEY")
PC_ENV = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "ivylevel-kb")
NAMESPACE = os.getenv("PINECONE_NAMESPACE_GREEN", "kb_v5_4")  # green deployment

EMBED_DIM = int(os.getenv("EMBED_DIM", "3072"))
BATCH_SIZE = 100

pc = Pinecone(api_key=PC_API)

def ensure_index():
    """Create Pinecone index if it doesn't exist."""
    existing = [i["name"] for i in pc.list_indexes()]
    if INDEX_NAME not in existing:
        print(f"Creating Pinecone index: {INDEX_NAME}")
        pc.create_index(
            name=INDEX_NAME,
            dimension=EMBED_DIM,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=PC_ENV)
        )
        time.sleep(5)  # wait for index to be ready

def fetch_chips(conn):
    """Generator: fetch all chips from Postgres."""
    cur = conn.execute("""
        SELECT
            chip_id, text, chip_type, student_id, source_kind, phase, week,
            chip_date, award, activity, framework, meta, confidence
        FROM kb_chips
        ORDER BY created_ts
    """)
    for row in cur:
        yield row

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=10))
def upsert_batch(index, batch):
    """Upsert a batch of vectors to Pinecone with retry logic."""
    index.upsert(vectors=batch, namespace=NAMESPACE)

def main():
    print(f"🚀 Starting Pinecone export (v5.4)")
    print(f"📍 Index: {INDEX_NAME}, Namespace: {NAMESPACE}")

    ensure_index()
    index = pc.Index(INDEX_NAME)

    buf_texts, buf_meta, buf_ids = [], [], []
    total_exported = 0

    with psycopg.connect(DB, row_factory=dict_row) as conn:
        for row in fetch_chips(conn):
            # Skip chips with no text
            if not row["text"] or not row["text"].strip():
                continue
            buf_texts.append(row["text"])
            # Build metadata, filtering out None values (Pinecone doesn't accept nulls)
            meta = {
                "chip_type": row["chip_type"],
                "student_id": row["student_id"],
                "kb_schema_version": "5.4"
            }
            if row["source_kind"]:
                meta["source_kind"] = row["source_kind"]
            if row["phase"]:
                meta["phase"] = row["phase"]
            if row["week"]:
                meta["week"] = row["week"]
            if row["chip_date"]:
                meta["date"] = str(row["chip_date"])
            if row["award"]:
                meta["award"] = row["award"]
            if row["activity"]:
                meta["activity"] = row["activity"]
            if row["framework"]:
                meta["framework"] = row["framework"]
            if row["confidence"]:
                meta["confidence"] = float(row["confidence"])
            buf_meta.append(meta)
            buf_ids.append(row["chip_id"])

            if len(buf_texts) >= BATCH_SIZE:
                # Embed batch
                vecs = embed_texts(buf_texts)

                # Prepare Pinecone payload
                payload = [{
                    "id": buf_ids[j],
                    "values": vecs[j].tolist(),
                    "metadata": buf_meta[j]
                } for j in range(len(buf_ids))]

                # Upsert to Pinecone
                upsert_batch(index, payload)
                total_exported += len(payload)
                print(f"  Exported {total_exported} chips...")

                # Reset buffers
                buf_texts, buf_meta, buf_ids = [], [], []
                time.sleep(0.2)  # rate limiting

        # Final batch
        if buf_texts:
            vecs = embed_texts(buf_texts)
            payload = [{
                "id": buf_ids[j],
                "values": vecs[j].tolist(),
                "metadata": buf_meta[j]
            } for j in range(len(buf_ids))]
            upsert_batch(index, payload)
            total_exported += len(payload)

    print(f"\n✅ Export complete!")
    print(f"  Total chips exported: {total_exported}")
    print(f"  Pinecone index: {INDEX_NAME}")
    print(f"  Namespace: {NAMESPACE}")
    print(f"\n💡 To cutover, update your API to use PINECONE_NAMESPACE_GREEN={NAMESPACE}")
    print(f"💡 Keep old namespace as backup until satisfied, then delete:")
    print(f"   pc.Index('{INDEX_NAME}').delete(namespace='kb_v5_3', delete_all=True)")

if __name__ == "__main__":
    main()
