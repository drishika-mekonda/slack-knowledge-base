from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    team_name: str = Field(..., min_length=2)
    role: Optional[str] = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    team_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    filename: str
    uploaded_by: str
    scope: str
    tags: List[str]
    source: str
    channel: Optional[str] = None
    thread_id: Optional[str] = None
    chunk_count: str
    created_at: datetime

    class Config:
        from_attributes = True

# Slack Schemas
class SlackIngestRequest(BaseModel):
    channel_id: str
    thread_ts: Optional[str] = None
    scope: str = "organization"  # personal, team, organization

class SlackIngestResponse(BaseModel):
    document_id: str
    filename: str
    channel: str
    thread_id: Optional[str] = None
    message_count: int
    chunk_count: int
    tags: List[str]

# Chat Schemas
class Citation(BaseModel):
    source: str  # filename or Slack source
    chunk_id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class AskRequest(BaseModel):
    question: str
    scope: str = "organization"  # personal, team, organization
    conversation_id: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    citations: List[Citation]
    conversation_id: str

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    title: str
    scope: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: str
    title: str
    scope: str
    messages: List[MessageResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Summary Schemas
class SummaryRequest(BaseModel):
    source_id: str

class SummaryResponse(BaseModel):
    summary: str
