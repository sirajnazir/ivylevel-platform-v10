#!/usr/bin/env python3
"""
KB Query Tool - Search and retrieve chips using FAISS
"""

import os
import sys
import json
import numpy as np
import faiss
from openai import OpenAI
from typing import List, Dict, Any, Optional

# ========== CONFIG ==========
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
EMBED_MODEL = "text-embedding-3-large"
EMBED_DIM = 3072

INDEX_PATH = "artifacts/kb/kb_intel.faiss"
IDS_PATH = "artifacts/kb/kb_intel.ids"
META_PATH = "artifacts/kb/kb_intel.meta.jsonl"

# ========== LOAD INDEX ==========
class KBSearcher:
    """FAISS-backed KB searcher"""

    def __init__(self):
        """Load FAISS index and metadata"""
        if not os.path.exists(INDEX_PATH):
            raise FileNotFoundError(f"FAISS index not found at {INDEX_PATH}")
        if not os.path.exists(IDS_PATH):
            raise FileNotFoundError(f"IDs file not found at {IDS_PATH}")
        if not os.path.exists(META_PATH):
            raise FileNotFoundError(f"Metadata not found at {META_PATH}")

        print(f"📚 Loading FAISS index from {INDEX_PATH}...", file=sys.stderr)
        self.index = faiss.read_index(INDEX_PATH)

        print(f"🆔 Loading chip IDs from {IDS_PATH}...", file=sys.stderr)
        with open(IDS_PATH, "r", encoding="utf-8") as f:
            self.chip_ids = f.read().splitlines()

        print(f"📋 Loading metadata from {META_PATH}...", file=sys.stderr)
        self.metadata = {}
        with open(META_PATH, "r", encoding="utf-8") as f:
            for line in f:
                meta = json.loads(line)
                self.metadata[meta["chip_id"]] = meta

        print(f"✅ Loaded {len(self.chip_ids)} chips", file=sys.stderr)

        # OpenAI client
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set")
        self.client = OpenAI(api_key=OPENAI_API_KEY)

    def embed_query(self, query: str) -> np.ndarray:
        """Create embedding for query text"""
        response = self.client.embeddings.create(
            model=EMBED_MODEL,
            input=[query]
        )
        return np.array(response.data[0].embedding, dtype="float32").reshape(1, -1)

    def search(
        self,
        query: str,
        k: int = 5,
        chip_type_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for top-k similar chips
        Args:
            query: natural language query
            k: number of results to return
            chip_type_filter: optional filter by chip type (e.g., "tactic")
        Returns:
            List of {chip_id, chip_type, title, summary, score, ...}
        """
        # Embed query
        query_vec = self.embed_query(query)

        # Search (retrieve more if filtering)
        search_k = k * 10 if chip_type_filter else k
        distances, indices = self.index.search(query_vec, search_k)

        # Build results
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1:
                continue

            chip_id = self.chip_ids[idx]
            meta = self.metadata.get(chip_id, {})

            # Apply chip type filter
            if chip_type_filter and meta.get("chip_type") != chip_type_filter:
                continue

            result = {
                "chip_id": chip_id,
                "score": float(distances[0][i]),
                **meta
            }
            results.append(result)

            if len(results) >= k:
                break

        return results

    def get_chip_full(self, chip_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full chip content from JSONL"""
        with open("artifacts/kb/derived_kb_intel.jsonl", "r", encoding="utf-8") as f:
            for line in f:
                chip = json.loads(line)
                if chip["chip_id"] == chip_id:
                    return chip
        return None

# ========== CLI ==========
def main():
    """CLI for KB search"""
    if len(sys.argv) < 2:
        print("Usage: python query_kb.py <query> [--type <chip_type>] [--top <k>] [--json]")
        print("\nExamples:")
        print("  python query_kb.py 'how did Jenny push NCWIT?'")
        print("  python query_kb.py 'essay tactics' --type tactic --top 10")
        print("  python query_kb.py 'what is the 168 framework?' --type framework")
        print("  python query_kb.py 'tactics' --json  # Output JSON for programmatic use")
        sys.exit(1)

    # Parse args
    query = sys.argv[1]
    chip_type_filter = None
    k = 5
    json_output = "--json" in sys.argv

    for i in range(2, len(sys.argv)):
        if sys.argv[i] == "--type" and i + 1 < len(sys.argv):
            chip_type_filter = sys.argv[i + 1]
        elif sys.argv[i] == "--top" and i + 1 < len(sys.argv):
            k = int(sys.argv[i + 1])

    # Search
    searcher = KBSearcher()

    if not json_output:
        print(f"\n🔍 Query: {query}", file=sys.stderr)
        if chip_type_filter:
            print(f"🏷️  Filter: chip_type={chip_type_filter}", file=sys.stderr)
        print(f"🔢 Top: {k}\n", file=sys.stderr)

    results = searcher.search(query, k=k, chip_type_filter=chip_type_filter)

    # JSON output for programmatic use (e.g., from Node.js)
    if json_output:
        print(json.dumps(results, ensure_ascii=False))
        return

    # Human-friendly output
    print("="*80)
    print(f"RESULTS ({len(results)})")
    print("="*80)

    for i, result in enumerate(results, 1):
        print(f"\n[{i}] {result['chip_type'].upper()} | Score: {result['score']:.4f}")
        print(f"    Title:   {result.get('title', 'N/A')}")
        print(f"    Summary: {result.get('summary', 'N/A')[:200]}")
        print(f"    Tags:    {', '.join(result.get('tags', []))}")
        print(f"    Source:  {result.get('filename', 'N/A')}")
        print(f"    ID:      {result['chip_id']}")

    # Optionally show full content for top result
    if results and "--full" in sys.argv:
        print("\n" + "="*80)
        print("FULL CONTENT (Top Result)")
        print("="*80)
        full = searcher.get_chip_full(results[0]["chip_id"])
        if full:
            print(json.dumps(full.get("content_json", {}), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
