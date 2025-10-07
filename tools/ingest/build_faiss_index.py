#!/usr/bin/env python3
"""
FAISS Vector Index Builder for KB Intel
Reads derived_kb_intel.jsonl → Creates embeddings → Builds FAISS index
"""

import os
import sys
import json
import numpy as np
import faiss
from openai import OpenAI
from typing import List, Dict, Any

# ========== CONFIG ==========
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
EMBED_MODEL = "text-embedding-3-large"  # 3072 dimensions
EMBED_DIM = 3072

JSONL_PATH = "artifacts/kb/derived_kb_intel.jsonl"
INDEX_PATH = "artifacts/kb/kb_intel.faiss"
IDS_PATH = "artifacts/kb/kb_intel.ids"
META_PATH = "artifacts/kb/kb_intel.meta.jsonl"

BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per batch

# ========== OPENAI CLIENT ==========
def init_openai():
    """Initialize OpenAI client"""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set")
    return OpenAI(api_key=OPENAI_API_KEY)

def embed_batch(client: OpenAI, texts: List[str]) -> List[np.ndarray]:
    """
    Create embeddings for a batch of texts
    Returns: list of numpy arrays (float32)
    """
    response = client.embeddings.create(
        model=EMBED_MODEL,
        input=texts
    )
    return [np.array(e.embedding, dtype="float32") for e in response.data]

# ========== TEXT PREPARATION ==========
def prepare_text_for_embedding(chip: Dict[str, Any]) -> str:
    """
    Prepare rich text representation of chip for embedding
    Format: [CHIP_TYPE] Title | Summary | {key content fields}
    """
    parts = [f"[{chip['chip_type'].upper()}]"]

    if chip.get("title"):
        parts.append(chip["title"])

    if chip.get("summary"):
        parts.append(chip["summary"])

    # Add selective content fields based on chip type
    content = chip.get("content_json", {})
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            content = {}

    # Type-specific enrichment
    chip_type = chip["chip_type"]

    if chip_type == "jtbd":
        if content.get("ask"):
            parts.append(f"Ask: {content['ask']}")
        if content.get("desired_outcome"):
            parts.append(f"Outcome: {content['desired_outcome']}")

    elif chip_type == "tactic":
        if content.get("goal"):
            parts.append(f"Goal: {content['goal']}")
        if content.get("steps"):
            steps_text = " → ".join(content["steps"][:3])  # first 3 steps
            parts.append(f"Steps: {steps_text}")

    elif chip_type == "micro_moment":
        if content.get("situation"):
            parts.append(f"Situation: {content['situation']}")
        if content.get("coach_message"):
            parts.append(f"Coach: {content['coach_message'][:200]}")

    elif chip_type == "framework":
        if content.get("when_to_use"):
            parts.append(f"Use: {content['when_to_use']}")

    elif chip_type == "reflection":
        if content.get("insight"):
            parts.append(f"Insight: {content['insight']}")

    elif chip_type == "success_path":
        if content.get("artifact"):
            parts.append(f"Artifact: {content['artifact']}")
        if content.get("phase_chain"):
            parts.append(f"Phases: {' → '.join(content['phase_chain'])}")

    elif chip_type == "style":
        if content.get("tone"):
            parts.append(f"Tone: {content['tone']}")

    # Add tags
    if chip.get("tags") and isinstance(chip["tags"], list):
        tags_str = ", ".join(chip["tags"])
        parts.append(f"Tags: {tags_str}")

    return " | ".join(parts)

# ========== MAIN ==========
def main():
    """Build FAISS index from JSONL"""
    print("🚀 Building FAISS Vector Index for KB Intel...")

    if not os.path.exists(JSONL_PATH):
        print(f"❌ ERROR: JSONL not found at {JSONL_PATH}", file=sys.stderr)
        print("   Run ingest_drive_intel.py first", file=sys.stderr)
        sys.exit(1)

    # Initialize OpenAI
    print("🔑 Initializing OpenAI client...")
    client = init_openai()

    # Load chips
    print(f"📖 Reading chips from {JSONL_PATH}...")
    chips = []
    with open(JSONL_PATH, "r", encoding="utf-8") as f:
        for line in f:
            chip = json.loads(line)
            chips.append(chip)

    print(f"   Loaded {len(chips)} chips")

    if len(chips) == 0:
        print("❌ No chips found. Exiting.")
        sys.exit(1)

    # Prepare texts for embedding
    print("📝 Preparing texts for embedding...")
    texts = [prepare_text_for_embedding(chip) for chip in chips]
    chip_ids = [chip["chip_id"] for chip in chips]

    # Create embeddings in batches
    print(f"🧮 Creating embeddings ({EMBED_MODEL}, dim={EMBED_DIM})...")
    all_embeddings = []
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(texts), BATCH_SIZE):
        batch_num = i // BATCH_SIZE + 1
        batch = texts[i:i + BATCH_SIZE]
        print(f"   Batch {batch_num}/{total_batches} ({len(batch)} texts)...")

        embeddings = embed_batch(client, batch)
        all_embeddings.extend(embeddings)

    # Convert to numpy matrix
    print("🔢 Converting to numpy matrix...")
    embedding_matrix = np.vstack(all_embeddings).astype("float32")
    print(f"   Shape: {embedding_matrix.shape}")

    # Build FAISS index
    print("🏗️  Building FAISS index (Flat L2)...")
    index = faiss.IndexFlatL2(EMBED_DIM)
    index.add(embedding_matrix)
    print(f"   Index contains {index.ntotal} vectors")

    # Save index
    print(f"💾 Saving FAISS index to {INDEX_PATH}...")
    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    faiss.write_index(index, INDEX_PATH)

    # Save chip IDs (for retrieval)
    print(f"💾 Saving chip IDs to {IDS_PATH}...")
    with open(IDS_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(chip_ids))

    # Save metadata (for display)
    print(f"💾 Saving metadata to {META_PATH}...")
    with open(META_PATH, "w", encoding="utf-8") as f:
        for chip in chips:
            meta = {
                "chip_id": chip["chip_id"],
                "chip_type": chip["chip_type"],
                "title": chip.get("title", ""),
                "summary": chip.get("summary", ""),
                "tags": chip.get("tags", []),
                "domain": chip.get("domain", ""),
                "filename": chip.get("filename", "")
            }
            f.write(json.dumps(meta, ensure_ascii=False) + "\n")

    # Final summary
    print("\n" + "="*60)
    print("✅ FAISS INDEX BUILD COMPLETE")
    print("="*60)
    print(f"Total chips:     {len(chips)}")
    print(f"Embedding model: {EMBED_MODEL}")
    print(f"Dimensions:      {EMBED_DIM}")
    print(f"Index type:      Flat L2")
    print(f"\nFiles created:")
    print(f"  🗂️  Index:    {INDEX_PATH}")
    print(f"  🆔 IDs:      {IDS_PATH}")
    print(f"  📋 Metadata: {META_PATH}")

if __name__ == "__main__":
    main()
