# AI-First HCP CRM

A production-ready, AI-first CRM module for pharmaceutical field representatives to log Healthcare
Professional (HCP) visits — either through a structured form or a natural-language AI chat powered by
**LangGraph** and **Groq**.

---

## 1. Project Overview

Field reps visit doctors constantly and logging those visits is friction-heavy. This module gives them
two ways to record a visit:

1. **Structured Form** — a classic, validated CRM form.
2. **AI Chat** — the rep just describes the visit in plain English ("Today I met Dr Raj at Apollo
   Hospital, discussed Diabetes medicine, follow-up next Tuesday") and an AI agent extracts the
   structured data, writes a professional visit summary, and saves it to the database automatically.

## 2. Features

- 🔐 JWT-based authentication with protected routes
- 📝 Structured "Log Interaction" form with full client-side validation (Zod + React Hook Form)
- 🤖 Conversational AI logging via a LangGraph agent (intent detection → entity extraction → tool
  execution → persistence → response generation)
- 🧰 Five LangGraph tools: Log Interaction, Edit Interaction, Search HCP, Generate Visit Summary,
  Schedule Follow-up
- 📊 Dashboard with live metrics (total interactions, doctors visited, upcoming follow-ups, AI-logged visits)
- 📋 Searchable interaction history table
- 🔔 Toast notifications, loading states, and inline validation throughout
- 🍃 MongoDB persistence via the async Motor driver

## 3. Architecture

```
┌────────────┐      HTTPS/JSON       ┌──────────────┐        Motor (async)      ┌───────────┐
│  React SPA │  ───────────────────▶ │   FastAPI    │  ────────────────────────▶ │  MongoDB  │
│ (Vite/RTK) │ ◀─────────────────── │  (JWT auth)  │ ◀──────────────────────── │           │
└────────────┘                       └──────┬───────┘                          └───────────┘
                                             │
                                             │ invokes on /chat
                                             ▼
                                    ┌────────────────────┐
                                    │   LangGraph Agent   │
                                    │ Intent → Entities →  │
                                    │ Tool Select → Tool   │
                                    │ Exec → DB → Response │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                        Groq LLM (gemma2-9b-it)
```

**Clean architecture layering (backend):**

- `routes.py` — HTTP boundary only (no business logic)
- `crud.py` — persistence logic (MongoDB access)
- `tools.py` — LangGraph tool implementations (business logic)
- `langgraph_agent.py` — orchestration graph wiring the tools together
- `schemas.py` / `models.py` — validation contracts and document shape helpers

## 4. Folder Structure

```
AI-HCP-CRM/
├── frontend/
│   ├── src/
│   │   ├── components/     # Sidebar, Navbar, FormInput, ChatBubble, DashboardCard, Loader, ProtectedRoute
│   │   ├── pages/          # Login, Dashboard, LogInteraction, InteractionHistory
│   │   ├── redux/          # store, authSlice, interactionSlice, chatSlice
│   │   ├── services/       # api, authService, interactionService, chatService
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── models.py           # enums + Mongo document factory helpers
│   │   ├── schemas.py          # Pydantic request/response schemas
│   │   ├── database.py         # Motor client + collection handles
│   │   ├── crud.py             # async data-access layer
│   │   ├── routes.py           # FastAPI routes
│   │   ├── auth.py             # JWT + password hashing
│   │   ├── langgraph_agent.py  # LangGraph orchestration graph
│   │   ├── tools.py            # 5 LangGraph tools
│   │   ├── prompts.py          # LLM prompt templates
│   │   └── main.py             # FastAPI app entrypoint
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 5. Installation

### Prerequisites
- Node.js 20+
- Python 3.12+
- MongoDB 7+ (local install or Docker)
- A [Groq API key](https://console.groq.com)

### Clone & configure

```bash
cp .env.example backend/.env
# edit backend/.env with your MONGO_URI, JWT_SECRET_KEY, and GROQ_API_KEY
```

## 6. Environment Variables

| Variable | Description | Default |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGO_DB_NAME` | Database name | `ai_hcp_crm` |
| `JWT_SECRET_KEY` | Secret used to sign JWTs | *(must be set in prod)* |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token TTL | `480` |
| `GROQ_API_KEY` | Groq API key for the LLM | *(required)* |
| `GROQ_MODEL` | Groq model id | `gemma2-9b-it` |
| `VITE_API_URL` | Frontend → backend base URL | `http://localhost:8000/api` |

## 7. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## 8. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000  (docs at /docs)
```

## 9. MongoDB Setup

**Local (no Docker):**
```bash
# macOS
brew install mongodb-community && brew services start mongodb-community
# Ubuntu
sudo apt install mongodb && sudo systemctl start mongodb
```

**Via Docker only:**
```bash
docker run -d --name ai_hcp_crm_mongo -p 27017:27017 mongo:7
```

Collections (`users`, `hcps`, `interactions`, `products`, `followups`, `chat_history`) and their
indexes are created automatically on backend startup — no manual migration step is required since
MongoDB is schemaless.

Create your first user via the interactive docs at `http://localhost:8000/docs` using
`POST /api/register`, then log in from the app.

## 10. Groq API Setup

1. Create an account at [console.groq.com](https://console.groq.com)
2. Generate an API key
3. Set `GROQ_API_KEY` in `backend/.env`
4. (Optional) Switch `GROQ_MODEL` to `llama-3.3-70b-versatile` for higher-quality extraction at higher latency/cost

## 11. Running LangGraph

The agent graph is compiled once at import time in `langgraph_agent.py` and invoked per chat message:

```
Start → Intent Detection → Entity Extraction → Tool Selection → Tool Execution → Database → Generate Response → End
```

No separate process is required — it runs in-process inside the FastAPI `/api/chat` endpoint. All LLM
calls are async (`llm.ainvoke`) so the event loop is never blocked.

## 12. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Authenticate and receive a JWT |
| POST | `/api/register` | Create a new user |
| POST | `/api/interaction` | Create an interaction (structured form) |
| GET | `/api/interaction` | List the current user's interactions |
| PUT | `/api/interaction/{id}` | Update an interaction |
| DELETE | `/api/interaction/{id}` | Delete an interaction |
| POST | `/api/chat` | Send a message to the LangGraph AI agent |
| GET | `/api/chat/history/{session_id}` | Retrieve chat history for a session |
| GET | `/api/hcp` | List all HCPs |
| POST | `/api/followup` | Create a follow-up reminder |

## 13. Deployment

```bash
docker compose up --build
```

This starts MongoDB, the FastAPI backend, and the Vite dev server for the frontend. For a production
deployment, build the frontend with `npm run build` and serve the static output via Nginx/Vercel, and
run the backend behind a process manager (gunicorn + uvicorn workers) with `MONGO_URI` pointed at a
managed MongoDB cluster (e.g. MongoDB Atlas).

## 14. Future Improvements

- Role-based access control (manager vs. field rep views)
- File upload storage (S3/Cloud Storage) for the attachment field
- Voice-to-text input for the AI Chat tab
- Follow-up reminder notifications (email/push)
- Multi-turn context carried across chat turns (currently each message is processed independently
  by the graph, with history persisted for audit/display only)
- Analytics dashboard with product-level engagement trends
