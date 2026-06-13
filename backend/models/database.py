import os
import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.config import settings

# For SQLite, specify connect_args to avoid thread sharing issues
engine = create_engine(
    settings.SQLITE_DB_URL, 
    connect_args={"check_same_thread": False} if settings.SQLITE_DB_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    team_name = Column(String(100), nullable=False, index=True)
    role = Column(String(20), default="user")  # user, admin
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="uploader")
    conversations = relationship("Conversation", back_populates="user")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    filename = Column(String(255), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    scope = Column(String(50), nullable=False, index=True)  # personal, team, organization
    tags = Column(JSON, nullable=False, default=list)  # Stored as JSON list
    source = Column(String(50), default="pdf")  # pdf, slack
    channel = Column(String(100), nullable=True)  # if source=slack
    thread_id = Column(String(100), nullable=True)  # if source=slack
    chunk_count = Column(String(50), default="0")
    created_at = Column(DateTime, default=datetime.utcnow)

    uploader = relationship("User", back_populates="documents")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    scope = Column(String(50), default="organization")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(50), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)  # JSON representation of citations
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

def init_db():
    Base.metadata.create_all(bind=engine)
