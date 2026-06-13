from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.models.database import get_db, User as DBUser
from backend.models.schemas import SlackIngestRequest, SlackIngestResponse
from backend.services.auth_service import get_current_user
from backend.services.slack_service import SlackService
from backend.api.dependencies import get_slack_service

router = APIRouter(prefix="/ingest", tags=["slack-ingestion"])

@router.post("/slack", response_model=SlackIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_slack(
    payload: SlackIngestRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    slack_service: SlackService = Depends(get_slack_service)
):
    if payload.scope not in ["personal", "team", "organization"]:
        raise HTTPException(
            status_code=400, 
            detail="Invalid scope. Must be one of: personal, team, organization"
        )
        
    doc = slack_service.ingest_slack_content(
        channel_id=payload.channel_id,
        thread_ts=payload.thread_ts,
        scope=payload.scope,
        user_id=current_user.id,
        team_name=current_user.team_name,
        db=db
    )
    
    return SlackIngestResponse(
        document_id=doc.id,
        filename=doc.filename,
        channel=payload.channel_id,
        thread_id=payload.thread_ts,
        message_count=0, # messages are combined, not stored individually in DB
        chunk_count=int(doc.chunk_count),
        tags=doc.tags
    )
