#!/usr/bin/env python3
"""
KB v6 → v8 Embedding Pipeline
Takes validated KB v6 Intel Chips and embeds them to Pinecone kb_v8_e3l namespace
"""

import os
import sys
import json
from typing import List, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import OpenAI
from pinecone import Pinecone
from tqdm import tqdm
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))
from utils_tokens import chunk_by_tokens, count_tokens, get_encoder

# Config
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", "kb_v8_e3l")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = 32
MAX_TOKENS = int(os.getenv("CHUNK_MAX_TOKENS", "7500"))
OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "750"))

CHIPS_DIR = "/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/chips"

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30))
def upsert_batch(index, vectors, namespace):
    """Upsert a batch of vectors with retry logic."""
    index.upsert(vectors=vectors, namespace=namespace)

def embed_batch(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using OpenAI."""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]

def load_chips_from_file(filepath: Path) -> List[Dict]:
    """Load chips from either JSON array or JSONL format"""
    chips = []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().strip()

        if content.startswith('['):
            # JSON array format
            chips = json.loads(content)
        else:
            # JSONL format (one JSON object per line)
            for line in content.split('\n'):
                line = line.strip()
                if line:
                    try:
                        chip = json.loads(line)
                        chips.append(chip)
                    except json.JSONDecodeError:
                        continue

    return chips

def normalize_chip_to_v6(chip: Dict) -> Dict:
    """
    Normalize old-format chips to KB v6 format.
    Old format has: chip_id, chip_type, chip_content (nested dict), session_week, session_date
    New format has: chip_id, type, content (string), source_doc, metadata
    """
    # If it already has 'type' field, assume it's already v6 format
    if 'type' in chip:
        return chip

    # Old format detected - convert to v6
    chip_id = chip.get('chip_id', '')
    chip_type = chip.get('chip_type', 'Unknown')
    chip_content = chip.get('chip_content', {})
    session_week = chip.get('session_week', '')
    session_date = chip.get('session_date', '')

    # Convert nested chip_content dict to a plain string
    if isinstance(chip_content, dict):
        # Extract meaningful content from nested structure
        content_parts = []
        for key, value in chip_content.items():
            if isinstance(value, (str, int, float)):
                content_parts.append(f"{key}: {value}")
            elif isinstance(value, list):
                content_parts.append(f"{key}: {', '.join(str(v) for v in value)}")
            elif isinstance(value, dict):
                content_parts.append(f"{key}: {json.dumps(value)}")
        content_str = "; ".join(content_parts)
    else:
        content_str = str(chip_content)

    # Build v6 format chip
    v6_chip = {
        'chip_id': chip_id,
        'type': f"{chip_type.capitalize()}_Chip",
        'content': content_str,
        'source_doc': {
            'week': session_week,
            'date': session_date,
        },
        'metadata': {}
    }

    # Copy over other fields to metadata
    for key in ['quality_score', 'intel_value', 'silver_bullet']:
        if key in chip:
            v6_chip['metadata'][key] = chip[key]

    return v6_chip

def extract_week_from_chip_id(chip_id: str) -> int:
    """Extract week number from chip_id (e.g., W011-INSIGHT-001 → 11)"""
    parts = chip_id.split('-')
    if len(parts) >= 1 and parts[0].startswith('W'):
        try:
            return int(parts[0][1:])  # Remove 'W' prefix
        except:
            return 0
    return 0

def main():
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 KB v6 → v8 Embedding Pipeline")
    print(f"   Index: {PINECONE_INDEX}")
    print(f"   Namespace: {PINECONE_NAMESPACE}")
    print(f"   Embedding Model: {EMBED_MODEL}")
    print(f"   Batch Size: {BATCH_SIZE}")
    print(f"   Max Tokens: {MAX_TOKENS}")
    print(f"   Overlap Tokens: {OVERLAP_TOKENS}")
    print()

    # Initialize clients
    client = OpenAI(api_key=OPENAI_API_KEY)
    pc = Pinecone(api_key=PINECONE_API_KEY)
    index = pc.Index(PINECONE_INDEX)
    enc = get_encoder()

    # Load all chips from validated batch files
    all_chips = []
    chips_dir = Path(CHIPS_DIR)

    # Load all chip files (various naming patterns)
    batch_files = sorted([
        f for f in chips_dir.glob("w*chips*.json")
        if "summary" not in f.name.lower() and "markdown" not in f.name.lower()
    ])

    print(f"📂 Found {len(batch_files)} intel chips batch files")

    for batch_file in batch_files:
        chips = load_chips_from_file(batch_file)
        # Normalize all chips to v6 format
        normalized_chips = [normalize_chip_to_v6(chip) for chip in chips]
        all_chips.extend(normalized_chips)
        print(f"   ✓ {batch_file.name}: {len(chips)} chips")

    print(f"\n📊 Total chips loaded: {len(all_chips)}")
    print()

    buf_ids, buf_texts, buf_metas = [], [], []
    total_processed = 0
    total_skipped = 0

    for chip in tqdm(all_chips, desc="Embedding"):
        # Validate required fields
        if not chip.get('chip_id') or not chip.get('content'):
            total_skipped += 1
            continue

        content = chip['content']

        # Skip if content too short
        if len(content.strip()) < 50:
            total_skipped += 1
            continue

        chip_id = chip['chip_id']
        chip_type = chip.get('type', 'Unknown_Chip')

        # Extract metadata from chip
        source_doc = chip.get('source_doc', {})
        metadata_obj = chip.get('metadata', {})

        # Chunk by tokens
        chunks = chunk_by_tokens(content, MAX_TOKENS, OVERLAP_TOKENS, enc)
        chunk_total = len(chunks)

        # Build metadata base
        meta_base = {
            "chip_id": chip_id,
            "chip_type": chip_type,
            "student_id": "huda-2025",
            "kb_schema_version": "6.0",
        }

        # Add week from chip_id
        week = extract_week_from_chip_id(chip_id)
        if week > 0:
            meta_base['week'] = week

        # Add source_doc fields
        if isinstance(source_doc, dict):
            if source_doc.get('date'):
                meta_base['date'] = source_doc['date']
            if source_doc.get('phase'):
                meta_base['phase'] = source_doc['phase']
            if source_doc.get('filename'):
                meta_base['source_filename'] = source_doc['filename']

        # Add metadata fields
        if isinstance(metadata_obj, dict):
            if metadata_obj.get('participants'):
                meta_base['participants'] = metadata_obj['participants']
            if metadata_obj.get('quality_score'):
                meta_base['quality_score'] = metadata_obj['quality_score']
            if metadata_obj.get('confidence_score'):
                meta_base['confidence_score'] = metadata_obj['confidence_score']
            if metadata_obj.get('phase_enum'):
                meta_base['phase_enum'] = metadata_obj['phase_enum']
            if metadata_obj.get('themes'):
                meta_base['themes'] = metadata_obj['themes']
            if metadata_obj.get('silver_bullet'):
                meta_base['silver_bullet'] = metadata_obj['silver_bullet']

        # Add insight_vector if present
        if chip.get('insight_vector'):
            meta_base['insight_vector'] = chip['insight_vector']

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{chip_id}#c{idx}" if chunk_total > 1 else chip_id
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
    print(f"✅ KB v6 → v8 Embedding complete!")
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
