#!/usr/bin/env python3
"""
v5.7.1 Embedding Pipeline: v5.7 JSONL → Pinecone kb_v5_7_e3l
Takes v5.7 ingestion output and properly extracts + embeds narrative intelligence
"""

import os
import sys
import json
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from pinecone import Pinecone
from tqdm import tqdm

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))
from utils_json_repair_v56 import load_json_tolerant
from utils_tokens import chunk_by_tokens, count_tokens, get_encoder

# Config
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v5_7_e3l")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = 32
MAX_TOKENS = int(os.getenv("CHUNK_MAX_TOKENS", "7500"))
OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "750"))

def extract_clean_narrative(narrative_text: str) -> str:
    """
    Takes narrative_text from v5.7 output and extracts clean coaching intelligence.
    Handles both malformed JSON intelligence and plain text.
    """
    if not narrative_text or len(narrative_text) < 50:
        return ""

    # Check if it looks like JSON
    stripped = narrative_text.strip()
    if not (stripped.startswith('{') or stripped.startswith('[')):
        # It's already plain text
        return narrative_text

    # Try to parse as JSON
    parsed = load_json_tolerant(narrative_text)
    if not parsed:
        # If tolerant parser fails, return as-is (might be DOCX blob or other)
        return narrative_text

    # Now extract from intelligence layers
    parts = []

    # Priority 1: intelligence_layers_extracted
    if 'intelligence_layers_extracted' in parsed:
        intel = parsed['intelligence_layers_extracted']
        if isinstance(intel, dict):
            # Recursively extract all text from all layers
            for layer_key, layer_val in intel.items():
                if isinstance(layer_val, dict):
                    # Each layer contains insights
                    for insight_key, insight_val in layer_val.items():
                        if isinstance(insight_val, dict):
                            # Extract all string values from insight
                            for k, v in insight_val.items():
                                if isinstance(v, str) and len(v) > 20:
                                    # Skip timestamps and short codes
                                    if not k in ['timestamp', 'time', 'ts']:
                                        parts.append(v)
                        elif isinstance(insight_val, str) and len(insight_val) > 20:
                            parts.append(insight_val)

    # Priority 2: session_metadata fields
    if 'session_metadata' in parsed:
        meta = parsed['session_metadata']
        if isinstance(meta, dict):
            for field in ['session_focus', 'context', 'title']:
                val = meta.get(field)
                if isinstance(val, str) and len(val) > 20:
                    parts.append(val)

    # Priority 3: Other narrative fields
    for key in ['coaching_summary', 'critical_insights', 'narrative', 'summary', 'analysis']:
        val = parsed.get(key)
        if isinstance(val, str) and len(val) > 30:
            parts.append(val)

    if parts:
        result = ' '.join(parts)
        # Clean up whitespace
        import re
        result = re.sub(r'\s+', ' ', result)
        return result.strip()

    # Fallback: return original if nothing extracted
    return narrative_text

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30))
def upsert_batch(index, vectors, namespace):
    """Upsert a batch of vectors with retry logic."""
    index.upsert(vectors=vectors, namespace=namespace)

def embed_batch(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using OpenAI."""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]

def main(jsonl_path: str):
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 v5.7.1 Embedding Pipeline: v5.7 JSONL → Pinecone")
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

    # Read JSONL records
    records = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                records.append(json.loads(line))
            except:
                continue

    print(f"📂 Loaded {len(records)} records from v5.7 JSONL")

    buf_ids, buf_texts, buf_metas = [], [], []
    total_processed = 0
    total_skipped = 0

    for rec in tqdm(records, desc="Embedding"):
        if not rec.get('parse_success'):
            total_skipped += 1
            continue

        narrative_text = rec.get('narrative_text', '')

        # Extract clean narrative from potentially malformed JSON
        clean_text = extract_clean_narrative(narrative_text)

        if not clean_text or len(clean_text.strip()) < 50:
            total_skipped += 1
            continue

        # Generate deterministic ID
        doc_id = rec.get('file_name', '').replace('.json', '').replace('.docx', '').replace('.pdf', '')

        # Chunk by tokens
        chunks = chunk_by_tokens(clean_text, MAX_TOKENS, OVERLAP_TOKENS, enc)
        chunk_total = len(chunks)

        # Build metadata
        meta_base = {
            "chip_type": rec.get('intel_chip_type') or "reflection",
            "student_id": "huda-2025",
            "kb_schema_version": "5.7",
            "folder_kind": rec.get('folder_kind'),
            "source_ext": rec.get('source_ext'),
        }

        if rec.get('date'):
            meta_base['date'] = rec['date']
        if rec.get('week'):
            try:
                meta_base['week'] = int(rec['week'])
            except:
                pass
        if rec.get('phase'):
            meta_base['phase'] = rec['phase']
        if rec.get('title'):
            meta_base['title'] = rec['title']

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}#c{idx}" if chunk_total > 1 else doc_id
            chunk_meta = dict(meta_base)
            chunk_meta["chunk_index"] = idx
            chunk_meta["chunk_total"] = chunk_total
            chunk_meta["token_count"] = count_tokens(chunk, enc)

            buf_ids.append(chunk_id)
            buf_texts.append(chunk)
            buf_metas.append(chunk_meta)

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
    print(f"✅ v5.7.1 Embedding complete!")
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
    import argparse
    parser = argparse.ArgumentParser(description='v5.7.1 Embedding Pipeline')
    parser.add_argument('--jsonl', required=True, help='Input v5.7 JSONL path')
    args = parser.parse_args()

    main(args.jsonl)
