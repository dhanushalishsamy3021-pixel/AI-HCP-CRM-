"""
LangGraph tool implementations.

Each tool is a plain async Python function that takes structured arguments
and returns a JSON-serializable dict. They are invoked directly by the
"Tool Execution" node in langgraph_agent.py based on the intent chosen in
the "Tool Selection" step. All persistence goes through crud.py (MongoDB).
"""
from datetime import datetime
from typing import Optional, Dict, Any

from dateutil import parser as date_parser

from app import crud, models


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return date_parser.parse(value, fuzzy=True)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Tool 1: Log Interaction
# ---------------------------------------------------------------------------
async def log_interaction_tool(user_id: str, entities: Dict[str, Any], ai_summary: str) -> Dict[str, Any]:
    """Create a new interaction record from AI-extracted entities."""
    if not entities.get("doctor_name") or not entities.get("hospital"):
        return {"success": False, "error": "Missing doctor name or hospital. Please provide both."}

    meeting_date = _parse_date(entities.get("meeting_date")) or datetime.utcnow()
    follow_up_date = _parse_date(entities.get("follow_up_date"))
    meeting_type_str = (entities.get("meeting_type") or "IN_PERSON").upper()
    meeting_type = getattr(models.MeetingType, meeting_type_str, models.MeetingType.IN_PERSON)

    interaction = await crud.create_interaction(
        user_id=user_id,
        doctor_name=entities["doctor_name"],
        hospital=entities["hospital"],
        specialization=entities.get("specialization"),
        meeting_date=meeting_date,
        meeting_type=meeting_type,
        product_names=entities.get("products") or [],
        notes=entities.get("notes"),
        follow_up_date=follow_up_date,
        ai_summary=ai_summary,
        source="AI_CHAT",
    )
    return {
        "success": True,
        "interaction_id": interaction["id"],
        "doctor_name": interaction["hcp"]["name"],
        "hospital": interaction["hcp"]["hospital"],
        "products": [p["name"] for p in interaction["products"]],
        "follow_up_date": follow_up_date.isoformat() if follow_up_date else None,
    }


# ---------------------------------------------------------------------------
# Tool 2: Edit Interaction
# ---------------------------------------------------------------------------
async def edit_interaction_tool(interaction_id: Optional[str], entities: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing interaction with newly provided fields."""
    from app.schemas import InteractionUpdate

    if not interaction_id:
        return {"success": False, "error": "No interaction_id provided to edit."}

    update_data = InteractionUpdate(
        doctor_name=entities.get("doctor_name"),
        hospital=entities.get("hospital"),
        meeting_date=_parse_date(entities.get("meeting_date")),
        products=entities.get("products"),
        notes=entities.get("notes"),
        follow_up_date=_parse_date(entities.get("follow_up_date")),
    )
    interaction = await crud.update_interaction(interaction_id, update_data)
    if not interaction:
        return {"success": False, "error": "Interaction not found."}
    return {"success": True, "interaction_id": interaction["id"]}


# ---------------------------------------------------------------------------
# Tool 3: Search HCP
# ---------------------------------------------------------------------------
async def search_hcp_tool(query: str) -> Dict[str, Any]:
    """Search for a doctor/hospital by name."""
    if not query:
        return {"success": False, "error": "No search query provided."}
    results = await crud.search_hcps(query)
    return {
        "success": True,
        "results": [
            {"id": h["_id"], "name": h["name"], "hospital": h["hospital"], "specialization": h.get("specialization")}
            for h in results
        ],
    }


# ---------------------------------------------------------------------------
# Tool 4: Generate Visit Summary
# ---------------------------------------------------------------------------
def generate_visit_summary_tool(entities: Dict[str, Any], llm_summary: str) -> Dict[str, Any]:
    """Return a structured + narrative summary of the visit for confirmation to the rep."""
    return {
        "success": True,
        "summary": llm_summary,
        "highlights": {
            "doctor_name": entities.get("doctor_name"),
            "hospital": entities.get("hospital"),
            "products": entities.get("products"),
            "follow_up_date": entities.get("follow_up_date"),
        },
    }


# ---------------------------------------------------------------------------
# Tool 5: Schedule Follow-up
# ---------------------------------------------------------------------------
async def schedule_followup_tool(
    interaction_id: Optional[str],
    hcp_id: Optional[str],
    follow_up_date: Optional[str],
    remarks: Optional[str],
) -> Dict[str, Any]:
    """Create/attach a follow-up reminder to an interaction."""
    parsed_date = _parse_date(follow_up_date)
    if not parsed_date:
        return {"success": False, "error": "Could not understand the follow-up date. Please clarify."}
    if not interaction_id or not hcp_id:
        return {"success": False, "error": "A logged interaction is required before scheduling a follow-up."}

    followup = await crud.create_followup(interaction_id, hcp_id, parsed_date, remarks)
    return {"success": True, "followup_id": followup["id"], "due_date": parsed_date.isoformat()}
