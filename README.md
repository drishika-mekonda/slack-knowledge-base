# Intelligent Slack Knowledge Base — MVP (AI Hackathon 2025)

A production-quality MVP for an AI-powered Slack Knowledge Base built with FastAPI, React (Vite, TypeScript, TailwindCSS v4), Google Gemini (embeddings & text generation), ChromaDB vector store, and SQLite metadata store. This application features secure role-based knowledge scopes (Personal, Team, Organization), multi-turn chat sessions with citation highlights, document summarization, and direct Slack channel/thread ingestion.

---

## Architecture Diagram

```mermaid
graph TD
    %% User/Slack Client
    U[User/Browser] <-->|JWT Auth / HTTP API| F[React Frontend (Nginx)]
    S[Slack Workspace] <-->|Fetch channel/thread history| SlackClient[Slack WebClientWrapper]
    
    %% API Gateway / Controllers
    F <-->|Proxy API /api/| B[FastAPI Backend]
    
    %% Services
    B -->|Ingest Slack transcript| SlackService[Slack Ingest Service]
    B -->|Ingest PDF upload| DocService[PDF Upload Service]
    B -->|Q&A / History| ChatService[Multi-turn Chat Service]
    B -->|Generate summary| SummaryService[Summarization Service]
    
    %% Document parsing & chunking
    DocService -->|Extract text| pdfplumber[pdfplumber PDF parser]
    pdfplumber --> Chunker[Sentence-Aware Chunker]
    SlackService -->|Format transcripts| Chunker
    
    %% Embeddings & Generation
    Chunker -->|Texts| GeminiEmbed[GeminiEmbeddingFunction]
    GeminiEmbed -->|Embeddings| Chroma[ChromaDB persistent collection]
    
    %% RAG Retrieval
    ChatService -->|Embed query & Retrieve| Retriever[Retriever]
    Retriever -->|Metadata filters: personal, team, org| Chroma
    Retriever -->|Context chunks + history| Generator[Response Generator]
    Generator -->|Zero-temperature generation| GeminiFlash[Gemini 2.5 Flash]
    GeminiFlash -->|Grounded answers + citations| ChatService
    
    %% Metadata store
    SlackService & DocService & ChatService & SummaryService <-->|CRUD operations| SQLite[(SQLite Database)]
```

---

## Core Features

1. **Secure Access Control Scopes**:
   - **Personal**: Knowledge is private and queryable only by the owner.
   - **Team**: Shared across team members; query filters check user's team membership.
   - **Organization**: Globally accessible knowledge base records.
2. **Auto-Tagging (Gemini)**: Uploaded PDFs and ingested Slack threads are scanned by Gemini 2.5 Flash during extraction to generate 3-5 category tags.
3. **Slack Channel & Thread Ingestion**: Ingest message transcripts or individual thread replies, convert them into chronologically formatted transcripts, and vectorize them.
4. **Grounded RAG Pipeline**: Chat responses are generated using ONLY retrieved chunks. If no information is found in the database, the system outputs: `"I could not find information in the available knowledge base."`
5. **Citations with Highlighted Cards**: Each generated answer appends source indicators (e.g. `[1]`, `[2]`), and displays expandable reference cards with source metadata.
6. **Multi-Turn Chat Conversations**: Maintained session history inside SQLite feeds into the prompt to enable contextual follow-ups.
7. **Document Summarization**: Fast summarized outline generation of any processed source.

---

## Tech Stack

- **Frontend**: React 19, Vite 6, TypeScript, TailwindCSS v4, Lucide Icons, Axios, React Router v7
- **Backend**: FastAPI, Uvicorn, google-genai SDK, ChromaDB, SQLite (SQLAlchemy + aiosqlite), pdfplumber, slack-bolt + slack-sdk
- **Orchestration**: Docker Compose

---

## Local Setup Instructions

### Prerequisites
- [Docker](https://www.docker.com/products/docker-desktop) and Docker Compose installed.
- [Google AI Studio API Key](https://aistudio.google.com/) (for Gemini access).
- (Optional) Slack App Bot user configuration.

### Configuration (`.env`)
1. Duplicate `.env.example` to create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your API keys:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   
   # For Slack Ingestion (Optional)
   SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
   ```

### Running with Docker Compose
From the root directory, build and run both services:
```bash
docker-compose up --build
```

- **Frontend URL**: `http://localhost:3000`
- **Backend Swagger API Docs**: `http://localhost:8000/docs`

---

## Quick Hackathon Demo Guide

1. **Create Account**: Open `http://localhost:3000/register`, fill out username, email, team name (e.g. `Engineering`), and password. Registering automatically signs you in.
2. **Upload PDF**:
   - Go to **Ingest & Upload** -> **PDF Upload**.
   - Select **Organization** scope and drop a sample PDF (such as a company policy or system manual).
   - Click **Extract & Store**.
   - Review the AI auto-tags generated under the success message.
3. **Ingest Slack Feed**:
   - Go to the **Slack Import** tab.
   - Enter a public Channel ID where the bot resides, select **Team** scope, and click **Fetch and Ingest**.
4. **Ask Questions (Chat)**:
   - Go to **Knowledge Chat**.
   - Select the target **Organization** scope from the header.
   - Ask a question based on your uploaded PDF.
   - Verify that the answer includes citation numbers (`[1]`) linking back to the expandable citation cards containing the raw text chunks.
5. **Summarize Source**:
   - Go to the **Summarizer** page.
   - Choose your document from the select list, and click **Generate Summary**.
   - Review the bulleted outline created by Gemini.
