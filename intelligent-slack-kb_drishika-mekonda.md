# Project Name

**Intelligent Slack Knowledge Base**

---

## Attendee Details

**Name:** Drishika Mekonda
**GitHub Username:** YOUR_GITHUB_USERNAME <!-- Replace with your GitHub Username -->
**LinkedIn Profile:** `https://www.linkedin.com/in/YOUR_LINKEDIN_USERNAME` <!-- Replace with your LinkedIn profile link -->
**GitHub Project Repository:** `https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME` <!-- Replace with your public repository link -->

---

## Problem Statement Selected

**Intelligent Slack Knowledge Base**

---

## Project Description

The **Intelligent Slack Knowledge Base** is a secure, production-ready AI-powered Knowledge Base MVP designed for teams and organizations to prevent company knowledge from being scattered across disparate silos. 

It solves the problem of information fragmentation by aggregating text-heavy manuals (PDFs) and Slack conversation logs/threads into a secure, permission-scoped retrieval system. The application serves two main purposes:
1. It allows team members to ingest documents and import chronological Slack chats, categorizing them using AI.
2. It allows users to query this data via natural language, generating accurate, grounded answers backed by traceable citation cards.

---

## Approach

Our approach splits the workload into backend data pipeline retrieval and frontend aesthetic interaction:

1. **Access Boundaries & JWT Security**: Users belong to self-selected teams. Authentication is managed via JWT. We enforce three access levels (**Personal**, **Team**, and **Organization**). The backend dynamically injects metadata filters into vector search queries, guaranteeing that users cannot retrieve documents outside their scope.
2. **Ingestion & Auto-Tagging**: Extracted PDF content (using `pdfplumber` to maintain layout syntax) and imported Slack history replies are cleaned and split using a sentence-boundary-preserving text chunker. Chunks are automatically classified with category tags using `gemini-2.5-flash`.
3. **High-Dimensional Embeddings**: Chunks are vectorized using the new `gemini-embedding-2` model (3072 dimensions) and indexed in ChromaDB.
4. **Accuracy & Groundedness (RAG)**: Chat queries perform a vector lookup on authorized chunks. These chunks are fed to `gemini-2.5-flash` with a strict prompt template instructing the model to *only* answer using the context, citation indices (`[1]`, `[2]`), or decline politely.
5. **Multi-Turn Context Resolution**: Conversational threads are logged in SQLite. When a user asks a follow-up, past dialogue history is loaded and prepended to preserve continuity.
6. **Polished UX**: Frontend built with Vite, React 19, and TailwindCSS v4, adopting a premium glassmorphism theme that transitions smoothly between Light and Dark modes.

---

## Tech Stack and Tools Used

**Frontend:** React 19, TypeScript, Vite 6, TailwindCSS v4, Axios, Lucide React
**Backend:** FastAPI, Python 3.12/3.13, SQLAlchemy 2.0, SQLite
**Database:** SQLite (Metadata & Sessions), ChromaDB (Vector Database)
**AI Tools/API:** Google Gemini API (`gemini-2.5-flash` for generation & tagging, `gemini-embedding-2` for embeddings), official `google-genai` Python SDK
**Cloud/Deployment:** Docker, Docker Compose, Nginx (reverse proxying)
**Other Tools:** Git/GitHub, `pdfplumber`, Slack Web SDK / Bolt API

---

## Key Features

1. **Permission-Scoped Vector Retrieval**: Enforces Personal, Team, and Organization boundary filters at the database level.
2. **Slack Channel & Thread Ingestor**: Pulls discussion histories and thread logs chronologically.
3. **Conversational Chat with Expandable Citations**: Multi-turn dialog with citation cards showing snippet previews.
4. **AI-Generated Executive Summary**: Synthesizes long sources into structured markdown bullet points.
5. **Dynamic Light & Dark Theme**: Glassmorphic layout that transitions seamlessly between themes.

---

## What is Working?

1. User registration, login, and session validation using secure JWT tokens.
2. PDF text parsing, auto-tagging, chunking, and ChromaDB vector indexing.
3. Slack history/thread fetcher and chronological chat transcript builder.
4. Semantic vector search querying using JWT-restricted metadata filters.
5. Conversational multi-turn chat memory and grounded responses with citation footprints.
6. Markdown-based executive summary generator.
7. Smooth Light/Dark mode transitions on all components, cards, text areas, inputs, and select options.
8. Containerized multi-service setup using Docker Compose.

---

## What is Still in Progress?

* We are planning to add Slack Slash Commands (e.g. `/ask` and `/ingest`) directly into the Slack app interface so team members can query the knowledge base without leaving Slack.

---

## Screenshots or Demo

**Deployed Link:** Run Locally (Vite + FastAPI + Docker Compose)
**Demo Video Link:** [Add your demo video link here]
**Screenshots:** [Add your screenshot links here]

---

## Challenges Faced

1. **Python 3.13 Compatibility**: The `passlib` bcrypt context crashed on Python 3.13. Resolved by implementing standard, direct `bcrypt` hashing and verification functions.
2. **Gemini SDK Batch Embeddings**: In the new `google-genai` SDK, batch inputs can sometimes collapse. Resolved by serializing text chunk inputs into individual API calls.
3. **Slack Channel Scopes**: Bots can fail if the app lacks membership scopes. Resolved by implementing an auto-join fallback catch block to notify the user.

---

## Learnings

1. Setting up modern theme variables in Tailwind CSS v4 using `@theme` and binding them to dynamic root custom properties.
2. Structuring strict grounding parameters inside LLM prompts to prevent context hallucinations.
3. Optimizing SQLite schema relationships alongside a vector store for access control filters.

---

## Future Improvements

* Support additional file formats like DOCX, XLSX, and CSV.
* Implement BM25 hybrid search for better exact-match keyword matching.
* Integrate Microsoft Teams and Discord workspace importers.

---

## Final Note

This project is built from scratch for the AI Buildathon with a focus on enterprise security and production-ready microservice design.
