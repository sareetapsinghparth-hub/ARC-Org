"""Retriever Module for ReasonLens.

Handles: user question -> embedding -> FAISS similarity search -> top-k relevant chunks.
Composes EmbeddingGenerator and FAISSVectorStore while preserving backward compatibility.
"""

from ml.embeddings import EmbeddingGenerator
from ml.vector_store import FAISSVectorStore


class ReasonLensRetriever:
    """End-to-end semantic retriever using SentenceTransformers and FAISS."""

    def __init__(
        self,
        embedding_generator: EmbeddingGenerator | None = None,
        vector_store: FAISSVectorStore | None = None
    ):
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
        self.vector_store = vector_store or FAISSVectorStore()

        # Backward compatibility aliases
        self.model = self.embedding_generator.model
        self.index = self.vector_store.index
        self.metadata = self.vector_store.metadata

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """Search top-k most similar document chunks for a given query."""
        query_embedding = self.embedding_generator.encode_query(query)
        return self.vector_store.search(query_embedding, top_k=top_k)


if __name__ == "__main__":
    retriever = ReasonLensRetriever()

    question = input("\nAsk ReasonLens: ")
    results = retriever.search(question)

    print("\n" + "=" * 50)
    print("RAG CONTEXT")
    print("=" * 50)

    for result in results:
        print(f"\nSOURCE: {result['source']}")
        print(f"PAGE: {result['page']}")
        print(f"SIMILARITY: {result['similarity']:.4f}")
        print(f"ID: {result['id']}")
        print(f"TEXT:\n{result['text']}")
        print("-" * 50)
