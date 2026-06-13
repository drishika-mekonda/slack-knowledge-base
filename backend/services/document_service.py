import os
import uuid
import json
import pdfplumber
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from backend.config import settings
from backend.models.database import Document as DBDocument
from backend.rag.chunker import chunk_text
from backend.rag.embeddings import generate_embeddings, get_genai_client
from backend.vectorstore.chroma_store import ChromaStore

class DocumentService:
    def __init__(self, chroma_store: ChromaStore):
        self.chroma_store = chroma_store
        self.genai_client = get_genai_client()

    def auto_tag_document(self, filename: str, content_sample: str) -> List[str]:
        """Use Gemini 2.5 Flash to automatically generate descriptive tags for the document."""
        if not self.genai_client:
            return ["General"]
            
        prompt = (
            f"Analyze the following document metadata and content preview, "
            f"and generate 3 to 5 highly relevant category tags (like 'HR', 'Leave Policy', 'Onboarding').\n"
            f"Document Title: {filename}\n"
            f"Content Preview: {content_sample[:1500]}\n\n"
            f"Output ONLY a valid JSON list of strings, for example: [\"HR\", \"Leave Policy\"]."
        )
        
        try:
            response = self.genai_client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )
            text = response.text.strip()
            # Clean possible markdown formatting
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            tags = json.loads(text)
            if isinstance(tags, list):
                return [str(t) for t in tags]
            return ["General"]
        except Exception as e:
            print(f"Error auto-tagging document: {e}")
            return ["General"]

    def upload_document(
        self, 
        file: UploadFile, 
        scope: str, 
        user_id: str, 
        team_name: str,
        db: Session
    ) -> DBDocument:
        """
        Process the PDF:
        1. Save to upload folder
        2. Extract text using pdfplumber
        3. Generate tags via Gemini
        4. Chunk text
        5. Embed chunks
        6. Store in ChromaDB & SQLite metadata
        """
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
            
        doc_id = str(uuid.uuid4())
        file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{file.filename}")
        
        # Save file to disk
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(file.file.read())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        # Extract text
        extracted_text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
        except Exception as e:
            # Clean up saved file
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=422, detail=f"Failed to parse PDF text: {str(e)}")

        if not extracted_text.strip():
            # Clean up
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=422, detail="No readable text found in the PDF.")

        # Auto generate tags
        tags = self.auto_tag_document(file.filename, extracted_text)

        # Chunk text
        chunks = chunk_text(extracted_text, chunk_size=settings.CHUNK_SIZE, overlap=settings.CHUNK_OVERLAP)
        
        if not chunks:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=422, detail="Document content was too short or could not be chunked.")

        # Embed chunks
        try:
            embeddings = generate_embeddings(chunks)
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

        # Store in ChromaDB
        metadata = {
            "filename": file.filename,
            "uploaded_by": user_id,
            "team_name": team_name,
            "scope": scope,
            "source": "pdf",
            "tags": tags
        }
        self.chroma_store.add_chunks(doc_id, chunks, embeddings, metadata)

        # Store in SQLite
        db_doc = DBDocument(
            id=doc_id,
            filename=file.filename,
            uploaded_by=user_id,
            scope=scope,
            tags=tags,
            source="pdf",
            chunk_count=str(len(chunks))
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        return db_doc

    def delete_document(self, doc_id: str, user_id: str, db: Session):
        """Delete document from SQLite and ChromaDB."""
        doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # Security check: User must be uploader or admin to delete
        if doc.uploaded_by != user_id:
            # Check if admin (can bypass)
            from backend.models.database import User
            user = db.query(User).filter(User.id == user_id).first()
            if not user or user.role != "admin":
                raise HTTPException(status_code=403, detail="Not authorized to delete this document")

        # Delete from ChromaDB
        self.chroma_store.delete_document(doc_id)

        # Delete file if exists
        file_name_pattern = f"{doc_id}_"
        for f in os.listdir(settings.UPLOAD_DIR):
            if f.startswith(file_name_pattern):
                try:
                    os.remove(os.path.join(settings.UPLOAD_DIR, f))
                except Exception as e:
                    print(f"Failed to delete file from disk: {e}")

        # Delete from SQLite
        db.delete(doc)
        db.commit()
        return True
