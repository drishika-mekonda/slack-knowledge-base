from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.models.database import get_db
from backend.config import settings

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """System health check endpoint."""
    # Check SQLite connection
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    return {
        "status": "healthy",
        "database": db_status,
        "features": {
            "gemini_api": bool(settings.GOOGLE_API_KEY),
            "slack_integration": bool(settings.SLACK_BOT_TOKEN)
        }
    }
