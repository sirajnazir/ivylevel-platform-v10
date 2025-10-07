#!/usr/bin/env python3
# tools/ingest/utils_tokens.py
from typing import List, Tuple
import tiktoken

def get_encoder(model: str = "text-embedding-3-large"):
    # text-embedding-3-large uses cl100k_base
    return tiktoken.get_encoding("cl100k_base")

def count_tokens(text: str, enc=None) -> int:
    if enc is None: enc = get_encoder()
    return len(enc.encode(text))

def chunk_by_tokens(
    text: str,
    max_tokens: int = 7500,
    overlap_tokens: int = 750,
    enc=None
) -> List[str]:
    """
    Split text into windows under max_tokens, with token overlap.
    """
    if enc is None: enc = get_encoder()
    ids = enc.encode(text)
    n = len(ids)
    chunks = []
    i = 0
    while i < n:
        j = min(i + max_tokens, n)
        chunk_ids = ids[i:j]
        chunks.append(enc.decode(chunk_ids))
        if j == n: break
        # step forward with overlap
        i = j - min(overlap_tokens, j - i)
    return chunks
