from typing import List, Dict, Any
from backend.rag.embeddings import generate_embedding
from backend.vectorstore.chroma_store import ChromaStore
from backend.models.schemas import Citation

class Retriever:
    def __init__(self, chroma_store: ChromaStore):
        self.chroma_store = chroma_store

    def retrieve(
        self, 
        question: str, 
        scope: str, 
        user_id: str, 
        team_name: str, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Embed the question and query ChromaDB for the top_k most relevant chunks
        matching the scope access filters.
        """
        # 1. Convert question to embedding
        query_vector = generate_embedding(question)
        
        # 2. Query ChromaStore
        results = self.chroma_store.query(
            query_embedding=query_vector,
            scope=scope,
            user_id=user_id,
            team_name=team_name,
            top_k=top_k
        )
        
        return results

    @staticmethod
    def format_citations(retrieved_results: List[Dict[str, Any]]) -> List[Citation]:
        """Convert retrieval results into a list of Citations."""
        citations = []
        for res in retrieved_results:
            metadata = res["metadata"]
            citations.append(Citation(
                source=metadata.get("filename", "unknown"),
                chunk_id=res["id"],
                content=res["document"],
                metadata=metadata
            ))
        return citations
