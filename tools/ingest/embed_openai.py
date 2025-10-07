#!/usr/bin/env python3
"""
OpenAI Embeddings Helper for v5.4
"""

import os
import numpy as np
from typing import List
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-large")
DIM = int(os.getenv("EMBED_DIM", "3072"))

client = None

def _get_client():
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        client = OpenAI(api_key=api_key)
    return client

def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Embed a list of texts using OpenAI's embedding API.
    Returns a numpy array of shape (len(texts), DIM).
    """
    if not texts:
        return np.zeros((0, DIM), dtype=np.float32)

    c = _get_client()
    resp = c.embeddings.create(model=MODEL, input=texts)
    vecs = [d.embedding for d in resp.data]
    return np.array(vecs, dtype=np.float32)
