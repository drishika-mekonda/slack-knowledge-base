import chromadb
from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.rag.embeddings import GeminiEmbeddingFunction

class ChromaStore:
    def __init__(self):
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        # Setup custom embedding function for fallback or queries
        self.embedding_function = GeminiEmbeddingFunction()
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            embedding_function=self.embedding_function
        )

    def add_chunks(
        self, 
        doc_id: str, 
        chunks: List[str], 
        embeddings: List[List[float]], 
        metadata: Dict[str, Any]
    ) -> List[str]:
        """
        Add text chunks and their embeddings to ChromaDB.
        Chroma metadata values must be primitive types (str, int, float, bool).
        """
        if not chunks:
            return []
            
        ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
        
        # Prepare metadata for each chunk
        # Extract tags and convert list/json to serialized string
        tags_list = metadata.get("tags", [])
        tags_str = ",".join(tags_list) if isinstance(tags_list, list) else str(tags_list)
        
        chunk_metadatas = []
        for i in range(len(chunks)):
            chunk_meta = {
                "doc_id": doc_id,
                "filename": metadata.get("filename", ""),
                "uploaded_by": metadata.get("uploaded_by", ""),
                "team_name": metadata.get("team_name", ""),
                "scope": metadata.get("scope", "organization"),
                "source": metadata.get("source", "pdf"),
                "tags": tags_str,
                "chunk_index": i
            }
            # Remove None values to avoid Chroma DB issues
            chunk_meta = {k: v for k, v in chunk_meta.items() if v is not None}
            chunk_metadatas.append(chunk_meta)

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=chunk_metadatas
        )
        return ids

    def query(
        self, 
        query_embedding: List[float], 
        scope: str, 
        user_id: str, 
        team_name: str, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Query ChromaDB vector store using metadata filters based on security scope.
        """
        # Determine metadata filters
        where_filter = {}
        if scope == "personal":
            where_filter = {
                "$and": [
                    {"scope": "personal"},
                    {"uploaded_by": user_id}
                ]
            }
        elif scope == "team":
            where_filter = {
                "$and": [
                    {"scope": "team"},
                    {"team_name": team_name}
                ]
            }
        else:  # organization
            where_filter = {"scope": "organization"}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter
        )
        
        # Format results
        formatted_results = []
        if not results or not results["documents"] or len(results["documents"][0]) == 0:
            return []
            
        documents = results["documents"][0]
        metadatas = results["metadatas"][0]
        distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(documents)
        ids = results["ids"][0]

        for i in range(len(documents)):
            formatted_results.append({
                "id": ids[i],
                "document": documents[i],
                "metadata": metadatas[i],
                "distance": distances[i]
            })
            
        return formatted_results

    def delete_document(self, doc_id: str):
        """Delete all vectors matching a specific doc_id."""
        self.collection.delete(where={"doc_id": doc_id})

    def get_document_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        """Retrieve all text chunks for a specific doc_id ordered by index."""
        results = self.collection.get(
            where={"doc_id": doc_id},
            include=["documents", "metadatas"]
        )
        if not results or not results["documents"]:
            return []
            
        chunks = []
        for i in range(len(results["documents"])):
            chunks.append({
                "id": results["ids"][i],
                "document": results["documents"][i],
                "metadata": results["metadatas"][i]
            })
            
        # Sort by chunk_index metadata
        chunks.sort(key=lambda x: x["metadata"].get("chunk_index", 0))
        return chunks
