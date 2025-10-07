#!/usr/bin/env python3
"""
v5.6 KB Ingestion: data/raw/jenny-huda → Pinecone kb_v5_6_e3l
Handles DOCX recovery, all INTEL schemas, proper text extraction, metadata enrichment
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
from utils_json_repair_v56 import load_json_tolerant, coalesce_embed_text
from utils_tokens import chunk_by_tokens, count_tokens, get_encoder

# Config - using CANONICAL data directories (these are the processed Intelligence files)
DATA_DIRS = [
    "data/canonical/jenny-huda/01-Intelligence-GamePlan",
    "data/canonical/jenny-huda/02-Intelligence-ExecutionDocs",
    "data/canonical/jenny-huda/03-Intelligence-SessionTranscripts",
    "data/canonical/jenny-huda/04-Intelligence-iMessage",
]

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v5_6_e3l")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = 32  # Conservative batch size for safety
MAX_TOKENS = int(os.getenv("CHUNK_MAX_TOKENS", "7500"))   # Safe for text-embedding-3-large (8192 limit)
OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "750"))

def clean_meta(payload: Dict[str, Any], filepath: str) -> Dict[str, Any]:
    """Extract clean metadata for Pinecone from JSON payload."""
    meta = {
        "chip_type": "reflection",  # All full-doc intel is reflection type
        "student_id": payload.get("student_id", "huda-2025"),
        "kb_schema_version": "5.6",
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
    elif "bank" in fname and "america" in fname:
        meta["award"] = "Bank of America"
    elif "jcamp" in fname:
        meta["activity"] = "JCamp"
    elif "kwk" in fname:
        meta["activity"] = "Kode With Klossy"

    return meta

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30))
def upsert_batch(index, vectors, namespace):
    """Upsert a batch of vectors with retry logic."""
    index.upsert(vectors=vectors, namespace=namespace)

def embed_batch(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using OpenAI."""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]

# Removed truncate_text - now using proper token-aware chunking instead

def main():
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 v5.6 KB Ingestion: RAW data → Pinecone")
    print(f"   Index: {PINECONE_INDEX}")
    print(f"   Namespace: {PINECONE_NAMESPACE}")
    print(f"   Embedding Model: {EMBED_MODEL}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print()

    # Initialize clients
    client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)
    enc = get_encoder()

    # Collect files
    files = []
    for d in DATA_DIRS:
        if os.path.exists(d):
            files.extend(glob.glob(os.path.join(d, "*.json")))

    print(f"📂 Found {len(files)} JSON files in RAW data directories")

    buf_ids, buf_texts, buf_metas = [], [], []
    total_processed = 0
    total_skipped = 0

    audit = []

    for f in tqdm(files, desc="Processing"):
        raw = open(f, "r", encoding="utf-8", errors="ignore").read()
        payload = load_json_tolerant(raw)

        if not payload or payload == {}:
            print(f"[SKIP] {f}: failed to parse JSON")
            total_skipped += 1
            audit.append({"file": f, "status": "SKIP", "reason": "json_parse_failed"})
            continue

        # Use the coalesce function to extract best text
        text, why_path = coalesce_embed_text(payload)

        if not text or len(text.strip()) < 50:
            total_skipped += 1
            audit.append({"file": f, "status": "SKIP", "reason": f"no_text_{why_path}"})
            continue

        text = text.strip()

        # Generate deterministic ID from file path
        doc_id = payload.get("id") or payload.get("name") or os.path.relpath(f)

        # Chunk by tokens to avoid exceeding embedding model limits
        chunks = chunk_by_tokens(text, MAX_TOKENS, OVERLAP_TOKENS, enc)
        chunk_total = len(chunks)
        meta_base = clean_meta(payload, f)

        for idx, chunk in enumerate(chunks):
            # Stable chunk ID: doc_id#c{idx}
            chunk_id = f"{doc_id}#c{idx}" if chunk_total > 1 else doc_id
            chunk_meta = dict(meta_base)
            chunk_meta["chunk_index"] = idx
            chunk_meta["chunk_total"] = chunk_total
            chunk_meta["token_count"] = count_tokens(chunk, enc)

            buf_ids.append(chunk_id)
            buf_texts.append(chunk)
            buf_metas.append(chunk_meta)

        audit.append({"file": f, "status": "OK", "text_source": why_path, "text_len": len(text), "chunks": chunk_total})

        # Process batch when full
        if len(buf_texts) >= BATCH_SIZE:
            try:
                embs = embed_batch(client, buf_texts)
                vectors = [
                    {"id": i, "values": e, "metadata": m}
                    for i, e, m in zip(buf_ids, embs, buf_metas)
                ]
                upsert_batch(index, vectors, PINECONE_NAMESPACE)
                total_processed += len(vectors)
                print(f"  ✅ Upserted {total_processed} chips")
            except Exception as ex:
                print(f"  ❌ Batch failed: {ex}")
                # Mark these as failed in audit
                for bid in buf_ids:
                    for a in audit:
                        if a.get("file", "").endswith(bid):
                            a["status"] = "FAILED"
                            a["reason"] = str(ex)
            finally:
                buf_ids, buf_texts, buf_metas = [], [], []

    # Process remaining
    if buf_texts:
        try:
            embs = embed_batch(client, buf_texts)
            vectors = [
                {"id": i, "values": e, "metadata": m}
                for i, e, m in zip(buf_ids, embs, buf_metas)
            ]
            upsert_batch(index, vectors, PINECONE_NAMESPACE)
            total_processed += len(vectors)
            print(f"  ✅ Upserted {total_processed} chips (final)")
        except Exception as ex:
            print(f"  ❌ Final batch failed: {ex}")

    print()
    print(f"✅ v5.6 Ingestion complete!")
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

    # Write audit log
    import csv
    audit_path = "artifacts/kb/ingest_audit_v56.csv"
    os.makedirs("artifacts/kb", exist_ok=True)
    with open(audit_path, "w", newline="", encoding="utf-8") as af:
        if audit:
            writer = csv.DictWriter(af, fieldnames=audit[0].keys())
            writer.writeheader()
            writer.writerows(audit)
    print(f"   Audit log: {audit_path}")

if __name__ == "__main__":
    main()
