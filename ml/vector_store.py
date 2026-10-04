"""Vector Database Module for ReasonLens.

Handles: vectors + metadata -> FAISS index and metadata store.
Reuses existing data/vector_store/physics.index and metadata.json.
"""

from pathlib import Path
import json
import faiss
import numpy as np


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_INDEX_PATH = BASE_DIR / "data" / "vector_store" / "physics.index"
DEFAULT_METADATA_PATH = BASE_DIR / "data" / "vector_store" / "metadata.json"


class FAISSVectorStore:
    """Manages the FAISS index and chunk metadata."""

    def __init__(
        self,
        index_path: Path | str = DEFAULT_INDEX_PATH,
        metadata_path: Path | str = DEFAULT_METADATA_PATH
    ):
        self.index_path = Path(index_path)
        self.metadata_path = Path(metadata_path)

        if not self.index_path.exists():
            raise FileNotFoundError(f"FAISS index file not found: {self.index_path}")
        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found: {self.metadata_path}")

        print("Loading FAISS index...")
        self.index = faiss.read_index(str(self.index_path))

        print("Loading metadata...")
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        if self.index.ntotal != len(self.metadata):
            raise ValueError(
                f"Mismatch: FAISS index has {self.index.ntotal} vectors "
                f"but metadata has {len(self.metadata)} entries."
            )

        print(f"Loaded {self.index.ntotal} vectors.")
        print(f"Embedding dimensions: {self.index.d}")
        print(f"Metadata entries: {len(self.metadata)}")

    @property
    def ntotal(self) -> int:
        return self.index.ntotal

    @property
    def dimension(self) -> int:
        return self.index.d

    def search(self, query_embedding: np.ndarray, top_k: int = 5) -> list[dict]:
        """Perform similarity search and map FAISS indices to metadata chunks."""
        scores, indices = self.index.search(query_embedding, top_k)
        results = []

        for score, index in zip(scores[0], indices[0]):
            if index == -1:
                continue

            item = self.metadata[index]
            results.append({
                "similarity": float(score),
                "id": item.get("id"),
                "source": item.get("source"),
                "page": item.get("page"),
                "text": item.get("text")
            })

        return results
