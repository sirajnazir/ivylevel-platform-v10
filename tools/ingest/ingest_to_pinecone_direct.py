#!/usr/bin/env python3
"""
Direct ingestion: JSON files → Pinecone kb_v5_5_e3l
Bypasses database, goes straight to vector store with text-embedding-3-large
"""

import os
import glob
import json
import sys
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from pinecone import Pinecone
from tqdm import tqdm

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))
from utils_json_repair import try_load_json

# Config
DATA_DIRS = [
    "data/canonical/jenny-huda/01-Intelligence-GamePlan",
    "data/canonical/jenny-huda/02-Intelligence-ExecutionDocs",
    "data/canonical/jenny-huda/03-Intelligence-SessionTranscripts",
    "data/canonical/jenny-huda/04-Intelligence-iMessage",
]

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v5_5_e3l")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = 1  # Process one at a time to avoid token limit issues with large documents

def clean_meta(payload: Dict[str, Any], filepath: str) -> Dict[str, Any]:
    """Extract clean metadata for Pinecone from JSON payload."""
    meta = {
        "chip_type": "reflection",  # All full-doc intel is reflection type
        "student_id": payload.get("student_id", "huda-2025"),
        "kb_schema_version": "5.5",
    }

    # Add optional fields if present
    if payload.get("kind"):
        meta["source_kind"] = payload["kind"]
    if payload.get("phase"):
        meta["phase"] = payload["phase"]
    if payload.get("week"):
        try:
            meta["week"] = int(payload["week"])
        except:
            pass
    if payload.get("date"):
        meta["date"] = payload["date"]
    if payload.get("name"):
        meta["title"] = payload["name"]
    if payload.get("path"):
        meta["path"] = payload["path"]

    # Extract award/framework/activity from filename or content
    fname = os.path.basename(filepath).lower()
    if "ncwit" in fname:
        meta["award"] = "NCWIT"
    elif "168" in fname or "168-hour" in fname:
        meta["framework"] = "168"

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
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 Direct ingestion: Local JSON → Pinecone")
    print(f"   Index: {PINECONE_INDEX}")
    print(f"   Namespace: {PINECONE_NAMESPACE}")
    print(f"   Embedding Model: {EMBED_MODEL}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print()

    # Initialize clients
    client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)

    # Collect files
    files = []
    for d in DATA_DIRS:
        if os.path.exists(d):
            files.extend(glob.glob(os.path.join(d, "*.json")))

    print(f"📂 Found {len(files)} JSON files")

    buf_ids, buf_texts, buf_metas = [], [], []
    total_processed = 0
    total_skipped = 0

    for f in tqdm(files, desc="Processing"):
        raw = open(f, "r", encoding="utf-8", errors="ignore").read()
        payload, err = try_load_json(raw)

        if not payload:
            print(f"[SKIP] {f}: {err}")
            total_skipped += 1
            continue

        # Extract text content
        text = payload.get("text", "")
        if isinstance(text, str) and text.strip():
            # Remove NUL bytes and clean whitespace
            text = text.replace('\x00', '').strip()

            if len(text) < 50:  # Skip very short texts
                total_skipped += 1
                continue

            # Truncate to approximately 7000 tokens (20000 chars at ~2.8 chars/token average)
            # This ensures we stay well under the 8192 token limit for text-embedding-3-large
            # Some JSON intelligence files can be very dense with lower chars/token ratio
            max_chars = 20000
            if len(text) > max_chars:
                text = text[:max_chars] + "..."

            # Generate deterministic ID from file path
            doc_id = payload.get("id") or payload.get("name") or os.path.relpath(f)

            buf_ids.append(doc_id)
            buf_texts.append(text)
            buf_metas.append(clean_meta(payload, f))

            # Process batch when full
            if len(buf_texts) >= BATCH_SIZE:
                embs = embed_batch(client, buf_texts)
                vectors = [
                    {"id": i, "values": e, "metadata": m}
                    for i, e, m in zip(buf_ids, embs, buf_metas)
                ]
                upsert_batch(index, vectors, PINECONE_NAMESPACE)
                total_processed += len(vectors)
                print(f"  ✅ Upserted {total_processed} chips")
                buf_ids, buf_texts, buf_metas = [], [], []
        else:
            total_skipped += 1

    # Process remaining
    if buf_texts:
        embs = embed_batch(client, buf_texts)
        vectors = [
            {"id": i, "values": e, "metadata": m}
            for i, e, m in zip(buf_ids, embs, buf_metas)
        ]
        upsert_batch(index, vectors, PINECONE_NAMESPACE)
        total_processed += len(vectors)
        print(f"  ✅ Upserted {total_processed} chips")

    print()
    print(f"✅ Ingestion complete!")
    print(f"   Total processed: {total_processed}")
    print(f"   Total skipped: {total_skipped}")
    print(f"   Namespace: {PINECONE_NAMESPACE}")

    # Show final stats
    try:
        stats = index.describe_index_stats()
        ns_count = stats.get("namespaces", {}).get(PINECONE_NAMESPACE, {}).get("vector_count", 0)
        print(f"   Vectors in namespace: {ns_count}")
    except Exception as e:
        print(f"⚠️  Could not get final stats: {e}")

if __name__ == "__main__":
    main()
