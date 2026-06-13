from sqlalchemy.orm import Session
from fastapi import HTTPException
from google.genai import types
from backend.config import settings
from backend.models.database import Document as DBDocument, User
from backend.vectorstore.chroma_store import ChromaStore
from backend.rag.embeddings import get_genai_client

class SummaryService:
    def __init__(self, chroma_store: ChromaStore):
        self.chroma_store = chroma_store
        self.genai_client = get_genai_client()

    def generate_summary(self, db: Session, doc_id: str, user: User) -> str:
        """
        Generate a summary of a document:
        1. Fetch document from SQL database and verify scope permissions
        2. Fetch all document chunks from ChromaDB
        3. Combine text content
        4. Summarize using Gemini 2.5 Flash
        """
        # 1. Fetch document and verify access
        doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Scope enforcement
        if doc.scope == "personal" and doc.uploaded_by != user.id:
            raise HTTPException(status_code=403, detail="Access denied. This is a personal document.")
        elif doc.scope == "team":
            # Fetch uploader's team
            uploader = db.query(User).filter(User.id == doc.uploaded_by).first()
            if not uploader or uploader.team_name != user.team_name:
                raise HTTPException(status_code=403, detail="Access denied. This document belongs to another team.")

        # 2. Fetch chunks from ChromaDB
        chunks = self.chroma_store.get_document_chunks(doc_id)
        if not chunks:
            raise HTTPException(status_code=404, detail="No text content chunks found for this document.")

        # 3. Combine text content
        full_text = "\n\n".join([c["document"] for c in chunks])
        
        # 4. Generate summary
        if not self.genai_client:
            return "Gemini API client is not initialized. Cannot generate summary."

        prompt = (
            f"Please generate a concise, professional, and comprehensive summary of the following document content.\n"
            f"Use markdown formatting, starting with a brief overview paragraph followed by a bulleted list of key takeaways.\n\n"
            f"Document Title: {doc.filename}\n"
            f"Document Content:\n{full_text[:30000]}\n"  # Truncate content if extremely large to fit limits
        )

        try:
            response = self.genai_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            return response.text.strip() if response.text else "Failed to generate summary text."
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini API error during summarization: {str(e)}")
