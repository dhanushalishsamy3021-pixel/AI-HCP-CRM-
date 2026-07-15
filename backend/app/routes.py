"""
FastAPI route definitions.

Endpoints:
  POST   /login
  POST   /interaction
  GET    /interaction
  PUT    /interaction/{id}
  DELETE /interaction/{id}
  POST   /chat
  GET    /hcp
  POST   /followup
"""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from app import crud, schemas
from app.auth import verify_password, create_access_token, get_current_user
from app.langgraph_agent import run_agent

router = APIRouter()


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@router.post("/login", response_model=schemas.Token, tags=["Auth"])
async def login(payload: schemas.UserLogin):
    user = await crud.get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token({"sub": user["_id"], "email": user["email"], "role": user["role"]})
    user_out = schemas.UserOut(id=user["_id"], full_name=user["full_name"], email=user["email"], role=user["role"])
    return schemas.Token(access_token=token, user=user_out)


@router.post("/register", response_model=schemas.UserOut, tags=["Auth"])
async def register(payload: schemas.UserCreate):
    if await crud.get_user_by_email(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await crud.create_user(payload)
    return schemas.UserOut(**user)


# ---------------------------------------------------------------------------
# Interactions
# ---------------------------------------------------------------------------
@router.post("/interaction", response_model=schemas.InteractionOut, tags=["Interactions"])
async def create_interaction(payload: schemas.InteractionCreate, current_user: dict = Depends(get_current_user)):
    interaction = await crud.create_interaction(
        user_id=current_user["_id"],
        doctor_name=payload.doctor_name,
        hospital=payload.hospital,
        specialization=payload.specialization,
        meeting_date=payload.meeting_date,
        meeting_type=payload.meeting_type,
        product_names=payload.products,
        notes=payload.notes,
        follow_up_date=payload.follow_up_date,
        attachment_url=payload.attachment_url,
        source="FORM",
    )
    return interaction


@router.get("/interaction", response_model=List[schemas.InteractionOut], tags=["Interactions"])
async def list_interactions(current_user: dict = Depends(get_current_user)):
    return await crud.list_interactions(user_id=current_user["_id"])


@router.put("/interaction/{interaction_id}", response_model=schemas.InteractionOut, tags=["Interactions"])
async def update_interaction(
    interaction_id: str,
    payload: schemas.InteractionUpdate,
    current_user: dict = Depends(get_current_user),
):
    interaction = await crud.update_interaction(interaction_id, payload)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.delete("/interaction/{interaction_id}", tags=["Interactions"])
async def delete_interaction(interaction_id: str, current_user: dict = Depends(get_current_user)):
    deleted = await crud.delete_interaction(interaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return {"success": True}


# ---------------------------------------------------------------------------
# HCPs
# ---------------------------------------------------------------------------
@router.get("/hcp", response_model=List[schemas.HCPOut], tags=["HCP"])
async def get_hcps(current_user: dict = Depends(get_current_user)):
    return await crud.list_hcps()


# ---------------------------------------------------------------------------
# Followups
# ---------------------------------------------------------------------------
@router.post("/followup", response_model=schemas.FollowupOut, tags=["Followups"])
async def create_followup(payload: schemas.FollowupCreate, current_user: dict = Depends(get_current_user)):
    return await crud.create_followup(payload.interaction_id, payload.hcp_id, payload.due_date, payload.remarks)


# ---------------------------------------------------------------------------
# AI Chat (LangGraph agent)
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=schemas.ChatResponse, tags=["AI Chat"])
async def chat(payload: schemas.ChatRequest, current_user: dict = Depends(get_current_user)):
    await crud.save_chat_message(current_user["_id"], payload.session_id, "user", payload.message)

    result = await run_agent(user_id=current_user["_id"], message=payload.message, session_id=payload.session_id)

    await crud.save_chat_message(
        current_user["_id"],
        payload.session_id,
        "assistant",
        result.get("reply", ""),
        extracted_data=json.dumps(result.get("entities", {})),
    )

    return schemas.ChatResponse(
        reply=result.get("reply", ""),
        session_id=payload.session_id,
        extracted_data=result.get("entities"),
        interaction_id=result.get("interaction_id"),
    )


@router.get("/chat/history/{session_id}", response_model=List[schemas.ChatHistoryOut], tags=["AI Chat"])
async def chat_history(session_id: str, current_user: dict = Depends(get_current_user)):
    return await crud.get_chat_history(session_id)
