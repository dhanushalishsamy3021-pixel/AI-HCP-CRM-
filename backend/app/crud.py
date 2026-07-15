"""
Async CRUD (Create/Read/Update/Delete) data-access functions for MongoDB.
Keeping DB logic here separates it from route/HTTP concerns (SOLID: SRP).

Every function that returns API-facing data returns plain dicts already
shaped to match the corresponding Pydantic *Out schema (with "id" instead
of Mongo's "_id"), so routes.py can pass results straight into response
models without extra mapping.
"""
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.database import (
    users_collection,
    hcps_collection,
    interactions_collection,
    products_collection,
    followups_collection,
    chat_history_collection,
)
from app import models, schemas
from app.auth import hash_password


def _doc_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Rename Mongo's `_id` to `id` for API responses."""
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
async def get_user_by_email(email: str) -> Optional[dict]:
    return await users_collection.find_one({"email": email})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    return await users_collection.find_one({"_id": user_id})


async def create_user(user_in: schemas.UserCreate) -> dict:
    doc = models.build_user_doc(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=user_in.role,
    )
    await users_collection.insert_one(doc)
    return _doc_id(doc)


# ---------------------------------------------------------------------------
# HCPs
# ---------------------------------------------------------------------------
async def get_or_create_hcp(name: str, hospital: str, specialization: Optional[str] = None) -> dict:
    existing = await hcps_collection.find_one({
        "name": {"$regex": f"^{name.strip()}$", "$options": "i"},
        "hospital": {"$regex": f"^{hospital.strip()}$", "$options": "i"},
    })
    if existing:
        return existing
    doc = models.build_hcp_doc(name, hospital, specialization)
    await hcps_collection.insert_one(doc)
    return doc


async def search_hcps(query: str) -> List[dict]:
    cursor = hcps_collection.find({
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"hospital": {"$regex": query, "$options": "i"}},
        ]
    }).limit(25)
    return [doc async for doc in cursor]


async def list_hcps() -> List[dict]:
    cursor = hcps_collection.find().sort("name", 1)
    docs = [doc async for doc in cursor]
    return [_doc_id(d) for d in docs]


async def get_hcp_by_id(hcp_id: str) -> Optional[dict]:
    return await hcps_collection.find_one({"_id": hcp_id})


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
async def get_or_create_product(name: str) -> dict:
    existing = await products_collection.find_one({"name": {"$regex": f"^{name.strip()}$", "$options": "i"}})
    if existing:
        return existing
    doc = models.build_product_doc(name)
    await products_collection.insert_one(doc)
    return doc


async def resolve_products(names: List[str]) -> List[dict]:
    result = []
    for name in names or []:
        if name and name.strip():
            result.append(await get_or_create_product(name))
    return result


async def get_products_by_ids(ids: List[str]) -> List[dict]:
    cursor = products_collection.find({"_id": {"$in": ids}})
    docs = [doc async for doc in cursor]
    return [_doc_id(d) for d in docs]


# ---------------------------------------------------------------------------
# Interactions
# ---------------------------------------------------------------------------
async def _hydrate_interaction(doc: dict) -> dict:
    """Attach the nested hcp + products payload expected by InteractionOut."""
    out = _doc_id(doc)
    hcp = await get_hcp_by_id(doc["hcp_id"])
    out["hcp"] = _doc_id(hcp)
    out["products"] = await get_products_by_ids(doc.get("product_ids", []))

    followup_cursor = followups_collection.find(
        {"interaction_id": doc["_id"]}
    ).sort("due_date", -1).limit(1)
    followup_docs = await followup_cursor.to_list(length=1)
    followup = followup_docs[0] if followup_docs else None
    out["follow_up_date"] = followup["due_date"] if followup else None
    return out


async def create_interaction(
    user_id: str,
    doctor_name: str,
    hospital: str,
    specialization: Optional[str],
    meeting_date: datetime,
    meeting_type,
    product_names: List[str],
    notes: Optional[str],
    follow_up_date: Optional[datetime],
    attachment_url: Optional[str] = None,
    ai_summary: Optional[str] = None,
    source: str = "FORM",
) -> dict:
    hcp = await get_or_create_hcp(doctor_name, hospital, specialization)
    products = await resolve_products(product_names)
    product_ids = [p["_id"] for p in products]

    meeting_type_value = meeting_type.value if hasattr(meeting_type, "value") else meeting_type

    doc = models.build_interaction_doc(
        hcp_id=hcp["_id"],
        created_by=user_id,
        meeting_date=meeting_date,
        meeting_type=meeting_type_value,
        product_ids=product_ids,
        notes=notes,
        ai_summary=ai_summary,
        attachment_url=attachment_url,
        source=source,
    )
    await interactions_collection.insert_one(doc)

    if follow_up_date:
        await create_followup(doc["_id"], hcp["_id"], follow_up_date, remarks="Auto-created from interaction")

    return await _hydrate_interaction(doc)


async def list_interactions(user_id: Optional[str] = None) -> List[dict]:
    query = {"created_by": user_id} if user_id else {}
    cursor = interactions_collection.find(query).sort("meeting_date", -1)
    docs = [doc async for doc in cursor]
    return [await _hydrate_interaction(d) for d in docs]


async def get_interaction(interaction_id: str) -> Optional[dict]:
    return await interactions_collection.find_one({"_id": interaction_id})


async def update_interaction(interaction_id: str, update: schemas.InteractionUpdate) -> Optional[dict]:
    doc = await get_interaction(interaction_id)
    if not doc:
        return None

    if update.doctor_name or update.hospital:
        hcp = await get_hcp_by_id(doc["hcp_id"])
        new_name = update.doctor_name or hcp["name"]
        new_hospital = update.hospital or hcp["hospital"]
        await hcps_collection.update_one({"_id": hcp["_id"]}, {"$set": {"name": new_name, "hospital": new_hospital}})

    set_fields: Dict[str, Any] = {"updated_at": datetime.utcnow()}
    if update.meeting_date:
        set_fields["meeting_date"] = update.meeting_date
    if update.meeting_type:
        set_fields["meeting_type"] = update.meeting_type.value
    if update.notes is not None:
        set_fields["notes"] = update.notes
    if update.ai_summary is not None:
        set_fields["ai_summary"] = update.ai_summary
    if update.products is not None:
        products = await resolve_products(update.products)
        set_fields["product_ids"] = [p["_id"] for p in products]

    await interactions_collection.update_one({"_id": interaction_id}, {"$set": set_fields})

    if update.follow_up_date:
        await create_followup(interaction_id, doc["hcp_id"], update.follow_up_date, remarks="Updated follow-up")

    updated = await get_interaction(interaction_id)
    return await _hydrate_interaction(updated)


async def delete_interaction(interaction_id: str) -> bool:
    result = await interactions_collection.delete_one({"_id": interaction_id})
    await followups_collection.delete_many({"interaction_id": interaction_id})
    return result.deleted_count > 0


# ---------------------------------------------------------------------------
# Followups
# ---------------------------------------------------------------------------
async def create_followup(interaction_id: str, hcp_id: str, due_date: datetime, remarks: Optional[str] = None) -> dict:
    doc = models.build_followup_doc(interaction_id, hcp_id, due_date, remarks)
    await followups_collection.insert_one(doc)
    return _doc_id(doc)


async def list_followups() -> List[dict]:
    cursor = followups_collection.find().sort("due_date", 1)
    docs = [doc async for doc in cursor]
    return [_doc_id(d) for d in docs]


# ---------------------------------------------------------------------------
# Chat history
# ---------------------------------------------------------------------------
async def save_chat_message(user_id: str, session_id: str, role: str, message: str, extracted_data: Optional[str] = None) -> dict:
    doc = models.build_chat_message_doc(user_id, session_id, role, message, extracted_data)
    await chat_history_collection.insert_one(doc)
    return _doc_id(doc)


async def get_chat_history(session_id: str) -> List[dict]:
    cursor = chat_history_collection.find({"session_id": session_id}).sort("created_at", 1)
    docs = [doc async for doc in cursor]
    return [_doc_id(d) for d in docs]
