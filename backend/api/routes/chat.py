from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.models.database import get_db, Conversation, Message, User as DBUser
from backend.models.schemas import AskRequest, AskResponse, ConversationResponse, ConversationDetailResponse
from backend.services.auth_service import get_current_user
from backend.services.chat_service import ChatService
from backend.api.dependencies import get_chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/ask", response_model=AskResponse)
def ask_question(
    payload: AskRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    if payload.scope not in ["personal", "team", "organization"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid scope. Must be one of: personal, team, organization"
        )
        
    response = chat_service.ask_question(
        db=db,
        user=current_user,
        question=payload.question,
        scope=payload.scope,
        conversation_id=payload.conversation_id
    )
    return response

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all conversation sessions for the current user."""
    conversations = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()
    return conversations

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation(
    conversation_id: str,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details and message history of a specific conversation session."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return conversation
