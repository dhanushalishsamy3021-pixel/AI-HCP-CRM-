"""
Domain enums and MongoDB document factory helpers.

MongoDB is schemaless, so these are not ORM classes — they are plain
dict-builders that guarantee every document written to a collection has a
consistent shape. Pydantic schemas (schemas.py) handle validation on the
API boundary; these helpers handle validation/shape on the persistence
boundary.
"""
import uuid
import enum
from datetime import datetime
from typing import Optional, List


class MeetingType(str, enum.Enum):
    IN_PERSON = "IN_PERSON"
    VIDEO_CALL = "VIDEO_CALL"
    PHONE_CALL = "PHONE_CALL"
    CONFERENCE = "CONFERENCE"


class FollowupStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


def new_id() -> str:
    return str(uuid.uuid4())


def build_user_doc(full_name: str, email: str, hashed_password: str, role: str = "FIELD_REP") -> dict:
    return {
        "_id": new_id(),
        "full_name": full_name,
        "email": email,
        "hashed_password": hashed_password,
        "role": role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }


def build_hcp_doc(name: str, hospital: str, specialization: Optional[str] = None) -> dict:
    return {
        "_id": new_id(),
        "name": name.strip(),
        "hospital": hospital.strip(),
        "specialization": specialization,
        "phone": None,
        "email": None,
        "city": None,
        "created_at": datetime.utcnow(),
    }


def build_product_doc(name: str) -> dict:
    return {
        "_id": new_id(),
        "name": name.strip(),
        "category": None,
        "description": None,
    }


def build_interaction_doc(
    hcp_id: str,
    created_by: str,
    meeting_date: datetime,
    meeting_type: str,
    product_ids: List[str],
    notes: Optional[str],
    ai_summary: Optional[str],
    attachment_url: Optional[str],
    source: str = "FORM",
) -> dict:
    now = datetime.utcnow()
    return {
        "_id": new_id(),
        "hcp_id": hcp_id,
        "created_by": created_by,
        "meeting_date": meeting_date,
        "meeting_type": meeting_type,
        "product_ids": product_ids,
        "notes": notes,
        "ai_summary": ai_summary,
        "attachment_url": attachment_url,
        "source": source,
        "created_at": now,
        "updated_at": now,
    }


def build_followup_doc(interaction_id: str, hcp_id: str, due_date: datetime, remarks: Optional[str] = None) -> dict:
    return {
        "_id": new_id(),
        "interaction_id": interaction_id,
        "hcp_id": hcp_id,
        "due_date": due_date,
        "status": FollowupStatus.PENDING.value,
        "remarks": remarks,
        "created_at": datetime.utcnow(),
    }


def build_chat_message_doc(user_id: str, session_id: str, role: str, message: str, extracted_data: Optional[str] = None) -> dict:
    return {
        "_id": new_id(),
        "user_id": user_id,
        "session_id": session_id,
        "role": role,
        "message": message,
        "extracted_data": extracted_data,
        "created_at": datetime.utcnow(),
    }
