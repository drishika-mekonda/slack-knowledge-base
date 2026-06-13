from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from backend.models.database import Conversation, Message, User
from backend.rag.retriever import Retriever
from backend.rag.generator import Generator

class ChatService:
    def __init__(self, retriever: Retriever, generator: Generator):
        self.retriever = retriever
        self.generator = generator

    def get_or_create_conversation(
        self, 
        db: Session, 
        user_id: str, 
        conversation_id: Optional[str], 
        first_question: str,
        scope: str
    ) -> Conversation:
        """Fetch an existing conversation or create a new one with a default title."""
        if conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id
            ).first()
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
            return conversation
            
        # Create new conversation
        title = first_question[:47] + "..." if len(first_question) > 50 else first_question
        conversation = Conversation(
            user_id=user_id,
            title=title,
            scope=scope
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    def load_history(self, db: Session, conversation_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Load recent messages in chronological order for conversation context."""
        messages = db.query(Message).filter(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc()).all()
        
        # Take last N messages
        recent_messages = messages[-limit:] if len(messages) > limit else messages
        
        return [{"role": m.role, "content": m.content} for m in recent_messages]

    def ask_question(
        self, 
        db: Session, 
        user: User, 
        question: str, 
        scope: str, 
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full RAG chat flow:
        1. Setup/get conversation context
        2. Load recent conversation history (multi-turn context)
        3. Query vector database (filtered by scope & user access)
        4. Generate grounded answer via Gemini
        5. Save message records to SQL DB
        """
        # 1. Resolve conversation
        conversation = self.get_or_create_conversation(db, user.id, conversation_id, question, scope)
        
        # 2. Load past history
        history = self.load_history(db, conversation.id)
        
        # 3. Retrieve matching context blocks
        retrieved_results = self.retriever.retrieve(
            question=question,
            scope=scope,
            user_id=user.id,
            team_name=user.team_name,
            top_k=5
        )
        
        # 4. Generate response
        answer = self.generator.generate_answer(
            question=question,
            context_chunks=retrieved_results,
            conversation_history=history
        )
        
        # 5. Format citations
        citations = self.retriever.format_citations(retrieved_results)
        # Serialize citations to JSON-friendly structure for database
        citations_data = [c.model_dump() for c in citations]
        
        # 6. Save User message to SQLite
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=question
        )
        db.add(user_message)
        
        # 7. Save Assistant response to SQLite
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer,
            citations=citations_data
        )
        db.add(assistant_message)
        
        # Update conversation timestamp
        conversation.updated_at = assistant_message.created_at
        
        db.commit()
        
        return {
            "answer": answer,
            "citations": citations_data,
            "conversation_id": conversation.id
        }
