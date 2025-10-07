#!/usr/bin/env python3
"""
iMessage KB v6 Embedding Pipeline
Embeds validated iMessage Intel Chips to Pinecone KBv6_iMessage namespace
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
from datetime import datetime

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))
from utils_tokens import chunk_by_tokens, count_tokens, get_encoder

# Config
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX = os.getenv("PINECONE_INDEX_NAME", "jenny-v3-3072-093025")
PINECONE_NAMESPACE = os.getenv("PINECONE_NAMESPACE", f"KBv6_iMessage_{datetime.utcnow().strftime('%Y-%m-%d')}_v1.0")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-large")
BATCH_SIZE = 32
MAX_TOKENS = int(os.getenv("CHUNK_MAX_TOKENS", "7500"))
OVERLAP_TOKENS = int(os.getenv("CHUNK_OVERLAP_TOKENS", "750"))

IMSG_CHIPS_DIR = "/Users/snazir/ivylevel-platform-v10/data/kb_intel_chips/imsg-chips"

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=30))
def upsert_batch(index, vectors, namespace):
    """Upsert a batch of vectors with retry logic."""
    index.upsert(vectors=vectors, namespace=namespace)

def embed_batch(client: OpenAI, texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts using OpenAI."""
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]

def load_chips_from_file(filepath: Path) -> List[Dict]:
    """Load chips from JSONL format"""
    chips = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    chip = json.loads(line)
                    chips.append(chip)
                except json.JSONDecodeError:
                    continue
    return chips

def extract_week_from_chip_id(chip_id: str) -> int:
    """
    Extract week number from iMessage chip_id
    Formats: IMSG-P1-TRUST-001, IM-2023-08-15-TONE-001
    Returns 0 if week not found (iMessage chips may not have weeks)
    """
    return 0  # iMessage chips don't use week-based numbering

def extract_phase_enum_from_phase(phase: str) -> str:
    """
    Extract phase enum from phase string.
    P1-FOUNDATION → FOUNDATION
    P3-JUNIOR → JUNIOR
    P1P2-FOUNDATION-BUILDING → FOUNDATION_BUILDING
    """
    # Remove leading phase numbers (P1-, P2-, etc.)
    if '-' in phase:
        parts = phase.split('-', 1)
        if parts[1]:
            return parts[1].replace('-', '_')
    return phase.replace('-', '_')

def main():
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY not set")
        sys.exit(1)
    if not PINECONE_API_KEY:
        print("❌ PINECONE_API_KEY not set")
        sys.exit(1)

    print(f"🚀 iMessage KB v6 Embedding Pipeline")
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

    # Load all iMessage chips from validated batch files
    all_chips = []
    chips_dir = Path(IMSG_CHIPS_DIR)

    # Load iMessage chip files
    batch_files = sorted(chips_dir.glob("iMessage_Intel_Chips_Batch_v*.jsonl"))

    if not batch_files:
        print(f"❌ No iMessage chip files found in {IMSG_CHIPS_DIR}")
        sys.exit(1)

    print(f"📂 Found {len(batch_files)} iMessage chips batch files")

    for batch_file in batch_files:
        chips = load_chips_from_file(batch_file)
        all_chips.extend(chips)
        print(f"   ✓ {batch_file.name}: {len(chips)} chips")

    print(f"\n📊 Total iMessage chips loaded: {len(all_chips)}")
    print()

    buf_ids, buf_texts, buf_metas = [], [], []
    total_processed = 0
    total_skipped = 0

    for chip in tqdm(all_chips, desc="Embedding iMessage chips"):
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
        chip_type = chip.get('type', 'Unknown')

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
            "chip_category": "iMessage",  # Mark as iMessage chip
            "student_id": "huda-2025",
            "kb_schema_version": "6.0",
        }

        # Add source_doc fields (flexible for both v6 and legacy schemas)
        if isinstance(source_doc, dict):
            # Date fields (multiple patterns supported)
            if source_doc.get('date'):
                meta_base['date'] = source_doc['date']
            elif source_doc.get('date_span'):
                meta_base['date_span'] = source_doc['date_span']
            if source_doc.get('date_range'):
                meta_base['date_range'] = source_doc['date_range']

            # Week range (for v6 schema)
            if source_doc.get('week_range'):
                meta_base['week_range'] = source_doc['week_range']

            # Phase
            if source_doc.get('phase'):
                meta_base['phase'] = source_doc['phase']
                # Auto-generate phase_enum if not present
                if not metadata_obj.get('phase_enum') and not source_doc.get('phase_enum'):
                    meta_base['phase_enum'] = extract_phase_enum_from_phase(source_doc['phase'])

            # Source filename
            if source_doc.get('filename'):
                meta_base['source_filename'] = source_doc['filename']

            # phase_enum from source_doc (legacy compatibility)
            if source_doc.get('phase_enum'):
                meta_base['phase_enum'] = source_doc['phase_enum']

        # Add metadata fields
        if isinstance(metadata_obj, dict):
            if metadata_obj.get('participants'):
                meta_base['participants'] = metadata_obj['participants']
            if metadata_obj.get('quality_score') is not None:
                meta_base['quality_score'] = metadata_obj['quality_score']
            if metadata_obj.get('confidence_score') is not None:
                meta_base['confidence_score'] = metadata_obj['confidence_score']
            if metadata_obj.get('phase_enum'):
                meta_base['phase_enum'] = metadata_obj['phase_enum']
            if metadata_obj.get('themes'):
                meta_base['themes'] = metadata_obj['themes']
            if metadata_obj.get('anchors'):
                meta_base['anchors'] = metadata_obj['anchors']
            if metadata_obj.get('situational_triggers'):
                meta_base['situational_triggers'] = metadata_obj['situational_triggers']

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
                print(f"  ✅ Upserted {total_processed} chunks")
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
            print(f"  ✅ Upserted {total_processed} chunks (final)")
        except Exception as ex:
            print(f"  ❌ Final batch failed: {ex}")

    print()
    print(f"✅ iMessage KB v6 Embedding complete!")
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
