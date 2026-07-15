"""
FastAPI application entrypoint for the AI-First HCP CRM backend.

Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_indexes
from app.routes import router

app = FastAPI(
    title="AI-First HCP CRM API",
    description="Backend for the pharmaceutical HCP interaction logging CRM, powered by LangGraph + Groq + MongoDB.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
async def on_startup():
    await init_indexes()


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "AI-First HCP CRM API", "database": "MongoDB"}
