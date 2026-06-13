import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.config import settings
from backend.models.database import Document as DBDocument
from backend.rag.chunker import chunk_text
from backend.rag.embeddings import generate_embeddings
from backend.vectorstore.chroma_store import ChromaStore
from backend.slack.client import SlackClientWrapper
from backend.services.document_service import DocumentService

class SlackService:
    def __init__(self, slack_client: SlackClientWrapper, chroma_store: ChromaStore, document_service: DocumentService):
        self.slack_client = slack_client
        self.chroma_store = chroma_store
        self.document_service = document_service

    def format_slack_messages(self, messages: List[Dict[str, Any]]) -> str:
        """Format a list of Slack messages into a cohesive text document."""
        if not messages:
            return ""
            
        formatted_blocks = []
        # Sort chronologically (conversations_history returns descending by default sometimes, replies returns ascending)
        # We want oldest messages first to read like a transcript
        sorted_messages = sorted(messages, key=lambda x: float(x.get("ts", 0)))
        
        for msg in sorted_messages:
            user = msg.get("user", "Unknown User")
            text = msg.get("text", "")
            # Skip empty messages or join channel messages
            if not text or "has joined the channel" in text:
                continue
            formatted_blocks.append(f"[{user}]: {text}")
            
        return "\n\n".join(formatted_blocks)

    def ingest_slack_content(
        self, 
        channel_id: str, 
        thread_ts: Optional[str], 
        scope: str, 
        user_id: str, 
        team_name: str,
        db: Session
    ) -> DBDocument:
        """
        Fetch Slack messages, construct transcript, chunk, embed,
        save to vector store and SQL database.
        """
        # 1. Fetch channel info to create a friendly filename
        channel_name = self.slack_client.get_channel_info(channel_id)
        
        # 2. Fetch messages
        if thread_ts:
            messages = self.slack_client.fetch_thread_messages(channel_id, thread_ts)
            filename = f"Slack Thread - #{channel_name} - Thread {thread_ts}"
        else:
            messages = self.slack_client.fetch_channel_messages(channel_id)
            filename = f"Slack Channel - #{channel_name} - Latest Messages"
            
        if not messages:
            raise HTTPException(status_code=404, detail="No messages found in the specified channel or thread.")

        # 3. Format into a transcript
        transcript = self.format_slack_messages(messages)
        if not transcript.strip():
            raise HTTPException(status_code=400, detail="No readable text contents found in the messages.")

        # 4. Auto-generate tags using Gemini via the DocumentService helper
        tags = self.document_service.auto_tag_document(filename, transcript)
        if "Slack" not in tags:
            tags.append("Slack")

        # 5. Chunking
        chunks = chunk_text(transcript, chunk_size=settings.CHUNK_SIZE, overlap=settings.CHUNK_OVERLAP)
        if not chunks:
            raise HTTPException(status_code=400, detail="Slack messages content was too short or could not be chunked.")

        # 6. Embeddings
        try:
            embeddings = generate_embeddings(chunks)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate embeddings: {str(e)}")

        # 7. Store in Vector Database
        doc_id = str(uuid.uuid4())
        metadata = {
            "filename": filename,
            "uploaded_by": user_id,
            "team_name": team_name,
            "scope": scope,
            "source": "slack",
            "tags": tags
        }
        self.chroma_store.add_chunks(doc_id, chunks, embeddings, metadata)

        # 8. Save Document record in SQLite
        db_doc = DBDocument(
            id=doc_id,
            filename=filename,
            uploaded_by=user_id,
            scope=scope,
            tags=tags,
            source="slack",
            channel=channel_id,
            thread_id=thread_ts,
            chunk_count=str(len(chunks))
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        return db_doc
