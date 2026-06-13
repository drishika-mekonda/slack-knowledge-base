from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.models.database import get_db, User as DBUser
from backend.models.schemas import SummaryRequest, SummaryResponse
from backend.services.auth_service import get_current_user
from backend.services.summary_service import SummaryService
from backend.api.dependencies import get_summary_service

router = APIRouter(prefix="/summary", tags=["summarization"])

@router.post("", response_model=SummaryResponse)
def generate_summary(
    payload: SummaryRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    summary_service: SummaryService = Depends(get_summary_service)
):
    summary = summary_service.generate_summary(
        db=db,
        doc_id=payload.source_id,
        user=current_user
    )
    return SummaryResponse(summary=summary)
