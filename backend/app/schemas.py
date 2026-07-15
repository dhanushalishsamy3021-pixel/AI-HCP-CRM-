"""
Pydantic schemas used for request validation and response serialization.
Documents come back from MongoDB as plain dicts with a string `_id`; the
`serialize_*` helpers in crud.py map those dicts onto these schemas.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from app.models import MeetingType, FollowupStatus


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "FIELD_REP"


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# HCP
# ---------------------------------------------------------------------------
class HCPBase(BaseModel):
    name: str
    hospital: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    city: Optional[str] = None


class HCPCreate(HCPBase):
    pass


class HCPOut(HCPBase):
    id: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
class ProductOut(BaseModel):
    id: str
    name: str
    category: Optional[str] = None


# ---------------------------------------------------------------------------
# Interaction
# ---------------------------------------------------------------------------
class InteractionCreate(BaseModel):
    doctor_name: str
    hospital: str
    specialization: Optional[str] = None
    meeting_date: datetime
    meeting_type: MeetingType = MeetingType.IN_PERSON
    products: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    attachment_url: Optional[str] = None


class InteractionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    meeting_date: Optional[datetime] = None
    meeting_type: Optional[MeetingType] = None
    products: Optional[List[str]] = None
    notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    ai_summary: Optional[str] = None


class InteractionOut(BaseModel):
    id: str
    meeting_date: datetime
    meeting_type: MeetingType
    notes: Optional[str] = None
    ai_summary: Optional[str] = None
    attachment_url: Optional[str] = None
    source: str
    created_at: datetime
    hcp: HCPOut
    products: List[ProductOut] = Field(default_factory=list)
    follow_up_date: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Followup
# ---------------------------------------------------------------------------
class FollowupCreate(BaseModel):
    interaction_id: str
    hcp_id: str
    due_date: datetime
    remarks: Optional[str] = None


class FollowupOut(BaseModel):
    id: str
    due_date: datetime
    status: FollowupStatus
    remarks: Optional[str] = None


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    extracted_data: Optional[dict] = None
    interaction_id: Optional[str] = None


class ChatHistoryOut(BaseModel):
    role: str
    message: str
    created_at: datetime
