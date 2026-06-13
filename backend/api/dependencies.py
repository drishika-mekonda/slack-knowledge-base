from fastapi import Depends
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.vectorstore.chroma_store import ChromaStore
from backend.rag.retriever import Retriever
from backend.rag.generator import Generator
from backend.services.document_service import DocumentService
from backend.slack.client import SlackClientWrapper
from backend.services.slack_service import SlackService
from backend.services.chat_service import ChatService
from backend.services.summary_service import SummaryService

# Singletons/shared instances
_chroma_store = None
_slack_client = None
_retriever = None
_generator = None

def get_chroma_store() -> ChromaStore:
    global _chroma_store
    if _chroma_store is None:
        _chroma_store = ChromaStore()
    return _chroma_store

def get_slack_client() -> SlackClientWrapper:
    global _slack_client
    if _slack_client is None:
        _slack_client = SlackClientWrapper()
    return _slack_client

def get_retriever(chroma_store: ChromaStore = Depends(get_chroma_store)) -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever(chroma_store)
    return _retriever

def get_generator() -> Generator:
    global _generator
    if _generator is None:
        _generator = Generator()
    return _generator

def get_document_service(chroma_store: ChromaStore = Depends(get_chroma_store)) -> DocumentService:
    return DocumentService(chroma_store)

def get_slack_service(
    slack_client: SlackClientWrapper = Depends(get_slack_client),
    chroma_store: ChromaStore = Depends(get_chroma_store),
    document_service: DocumentService = Depends(get_document_service)
) -> SlackService:
    return SlackService(slack_client, chroma_store, document_service)

def get_chat_service(
    retriever: Retriever = Depends(get_retriever),
    generator: Generator = Depends(get_generator)
) -> ChatService:
    return ChatService(retriever, generator)

def get_summary_service(chroma_store: ChromaStore = Depends(get_chroma_store)) -> SummaryService:
    return SummaryService(chroma_store)
