from typing import List, Union
from google import genai
from chromadb import EmbeddingFunction, Documents, Embeddings
from backend.config import settings

def get_genai_client():
    if not settings.GOOGLE_API_KEY:
        # Fallback to default credentials or mock if missing during initialization
        import os
        api_key = os.environ.get("GOOGLE_API_KEY", "")
        if not api_key:
            return None
        return genai.Client(api_key=api_key)
    return genai.Client(api_key=settings.GOOGLE_API_KEY)

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for a single text chunk using Gemini Embedding API."""
    client = get_genai_client()
    if not client:
        raise ValueError("GOOGLE_API_KEY is not configured. Cannot generate embeddings.")
        
    response = client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text
    )
    # response.embeddings contains the list of embeddings
    return response.embeddings[0].values

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of text chunks one by one to ensure correct shape matching."""
    if not texts:
        return []
    client = get_genai_client()
    if not client:
        raise ValueError("GOOGLE_API_KEY is not configured. Cannot generate embeddings.")
        
    embeddings = []
    for text in texts:
        response = client.models.embed_content(
            model=settings.EMBEDDING_MODEL,
            contents=text
        )
        embeddings.append(response.embeddings[0].values)
    return embeddings

class GeminiEmbeddingFunction(EmbeddingFunction):
    """Custom ChromaDB Embedding Function that uses Google Gemini API."""
    def __call__(self, input: Documents) -> Embeddings:
        return generate_embeddings(list(input))
