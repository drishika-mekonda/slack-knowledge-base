import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.config import settings
from backend.models.database import init_db
from backend.api.routes import auth, documents, slack_ingest, chat, summary, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("slack-kb")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing SQLite database...")
    init_db()
    
    logger.info(f"System settings: Gemini Model: {settings.GEMINI_MODEL}, Embedding Model: {settings.EMBEDDING_MODEL}")
    if not settings.GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY is not set. AI services will fail when called.")
    else:
        logger.info("Gemini API key is configured.")
        
    if not settings.SLACK_BOT_TOKEN:
        logger.warning("SLACK_BOT_TOKEN is not set. Slack ingestion features will be disabled.")
    else:
        logger.info("Slack Bot OAuth configuration detected.")
        
    yield
    # Shutdown actions (if any)
    logger.info("Shutting down application...")

app = FastAPI(
    title="Intelligent Slack Knowledge Base API",
    description="Backend services for RAG-based search, document summarization, and Slack ingestion.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve upload directories (useful for viewing source document files in UI)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include api routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(slack_ingest.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(summary.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Intelligent Slack Knowledge Base API. Visit /docs for documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
