from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from backend.models.database import get_db, Document as DBDocument, User as DBUser
from backend.models.schemas import DocumentResponse
from backend.services.auth_service import get_current_user
from backend.services.document_service import DocumentService
from backend.api.dependencies import get_document_service

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    scope: str = Form("organization"),  # personal, team, organization
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    doc_service: DocumentService = Depends(get_document_service)
):
    if scope not in ["personal", "team", "organization"]:
        raise HTTPException(status_code=400, detail="Invalid scope. Must be personal, team, or organization.")
        
    return doc_service.upload_document(
        file=file,
        scope=scope,
        user_id=current_user.id,
        team_name=current_user.team_name,
        db=db
    )

@router.get("", response_model=List[DocumentResponse])
def list_documents(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all documents that the current user is authorized to access:
    - Organization documents (visible to all)
    - Team documents (visible only to users on the same team)
    - Personal documents (visible only to the owner)
    """
    # SQLite query joining with uploader to filter team scope
    query = db.query(DBDocument).join(DBUser, DBDocument.uploaded_by == DBUser.id).filter(
        or_(
            DBDocument.scope == "organization",
            and_(
                DBDocument.scope == "team",
                DBUser.team_name == current_user.team_name
            ),
            and_(
                DBDocument.scope == "personal",
                DBDocument.uploaded_by == current_user.id
            )
        )
    )
    return query.all()

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check authorization
    uploader = db.query(DBUser).filter(DBUser.id == doc.uploaded_by).first()
    if doc.scope == "personal" and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this personal document.")
    elif doc.scope == "team" and (not uploader or uploader.team_name != current_user.team_name):
        raise HTTPException(status_code=403, detail="Access denied. This document belongs to another team.")
        
    return doc

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    doc_service: DocumentService = Depends(get_document_service)
):
    doc_service.delete_document(doc_id=doc_id, user_id=current_user.id, db=db)
    return None
