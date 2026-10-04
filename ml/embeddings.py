"""Embedding Generation Module for ReasonLens.

Handles: chunks / query texts -> Sentence Transformer -> 384-dimensional vectors.
"""

from typing import Union
import numpy as np
from sentence_transformers import SentenceTransformer


DEFAULT_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384


class EmbeddingGenerator:
    """Generates 384-dimensional normalized dense embeddings."""

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        print(f"Loading embedding model ({model_name})...")
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)
        self.dimension = EMBEDDING_DIMENSION

    def encode_query(self, query: str) -> np.ndarray:
        """Encode a single query string into normalized 384-dim vector."""
        return self.model.encode([query], normalize_embeddings=True)

    def encode_texts(self, texts: list[str]) -> np.ndarray:
        """Encode multiple text strings into normalized 384-dim vectors."""
        return self.model.encode(texts, normalize_embeddings=True)
