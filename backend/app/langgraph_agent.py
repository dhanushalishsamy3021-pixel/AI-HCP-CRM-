"""
LangGraph AI orchestration agent for the "Log Interaction via AI Chat" feature.

Graph flow:
    Start -> Intent Detection -> Entity Extraction -> Tool Selection
          -> Tool Execution -> Database -> Generate Response -> End

The graph is compiled once at import time and invoked per chat message via
`run_agent()`. Each invocation is stateless at the graph level; conversation
continuity is provided by loading recent chat_history rows before the call.
All nodes that touch persistence are async because the MongoDB driver
(Motor) is async end-to-end.
"""
import os
import json
from typing import TypedDict, Optional, Dict, Any, List
from datetime import datetime

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq

from app import prompts, tools

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

llm = ChatGroq(api_key=GROQ_API_KEY, model=GROQ_MODEL, temperature=0.2)


class AgentState(TypedDict, total=False):
    message: str
    user_id: str
    history: List[Dict[str, str]]
    interaction_id: Optional[str]  # provided when editing/following-up on an existing record
    intent: str
    entities: Dict[str, Any]
    ai_summary: str
    tool_result: Dict[str, Any]
    reply: str


# ---------------------------------------------------------------------------
# Node: Intent Detection
# ---------------------------------------------------------------------------
async def intent_detection_node(state: AgentState) -> AgentState:
    prompt = prompts.INTENT_DETECTION_PROMPT.format(message=state["message"])
    result = await llm.ainvoke(prompt)
    raw = result.content.strip().upper()
    valid_intents = {
        "LOG_INTERACTION", "EDIT_INTERACTION", "SEARCH_HCP",
        "GENERATE_SUMMARY", "SCHEDULE_FOLLOWUP", "GENERAL_QUERY",
    }
    # Exact match first; fall back to scanning if the LLM added extra words
    if raw in valid_intents:
        state["intent"] = raw
    else:
        found = next((i for i in valid_intents if i in raw), "GENERAL_QUERY")
        state["intent"] = found
    return state



# ---------------------------------------------------------------------------
# Node: Entity Extraction
# ---------------------------------------------------------------------------
async def entity_extraction_node(state: AgentState) -> AgentState:
    existing_entities = state.get("entities", {}) or {}

    if state["intent"] == "GENERAL_QUERY":
        state["entities"] = existing_entities
        return state

    today = datetime.utcnow().strftime("%Y-%m-%d")
    prompt = prompts.ENTITY_EXTRACTION_PROMPT.format(message=state["message"], today=today)
    result = await llm.ainvoke(prompt)
    raw = result.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        new_entities = json.loads(raw)
    except json.JSONDecodeError:
        new_entities = {
            "doctor_name": None, "hospital": None, "specialization": None,
            "products": [], "meeting_date": None, "meeting_type": None,
            "follow_up_date": None, "notes": state["message"],
        }

    merged = {}
    keys = ["doctor_name", "hospital", "specialization", "products", "meeting_date", "meeting_type", "follow_up_date", "notes"]
    for k in keys:
        old_val = existing_entities.get(k)
        new_val = new_entities.get(k)
        if k == "products":
            old_prod = old_val if isinstance(old_val, list) else []
            new_prod = new_val if isinstance(new_val, list) else []
            merged[k] = list(set(old_prod + new_prod))
        else:
            if new_val is not None and new_val != "":
                merged[k] = new_val
            else:
                merged[k] = old_val if old_val is not None else None

    state["entities"] = merged
    return state


# ---------------------------------------------------------------------------
# Node: Tool Selection + Execution (selection is an intent -> tool map)
# ---------------------------------------------------------------------------
async def tool_execution_node(state: AgentState) -> AgentState:
    intent = state["intent"]
    entities = state.get("entities", {})

    if intent == "LOG_INTERACTION":
        # Attempt to auto-fill missing hospital and specialization from the database using doctor_name
        doc_name = entities.get("doctor_name")
        if doc_name and (not entities.get("hospital") or not entities.get("specialization")):
            from app import crud
            hcp_results = await crud.search_hcps(doc_name)
            if hcp_results:
                match = None
                for h in hcp_results:
                    if h["name"].lower() == doc_name.lower() or doc_name.lower() in h["name"].lower():
                        match = h
                        break
                if match:
                    if not entities.get("hospital"):
                        entities["hospital"] = match["hospital"]
                    if not entities.get("specialization") and match.get("specialization"):
                        entities["specialization"] = match["specialization"]

        summary_prompt = prompts.SUMMARY_GENERATION_PROMPT.format(
            doctor_name=entities.get("doctor_name") or "Unknown",
            hospital=entities.get("hospital") or "Unknown",
            products=", ".join(entities.get("products") or []) or "None",
            follow_up_date=entities.get("follow_up_date") or "None",
            notes=entities.get("notes") or "None",
        )
        ai_summary = (await llm.ainvoke(summary_prompt)).content.strip()
        state["ai_summary"] = ai_summary
        state["tool_result"] = await tools.log_interaction_tool(state["user_id"], entities, ai_summary)

    elif intent == "EDIT_INTERACTION":
        state["tool_result"] = await tools.edit_interaction_tool(state.get("interaction_id"), entities)

    elif intent == "SEARCH_HCP":
        query = entities.get("doctor_name") or entities.get("hospital") or state["message"]
        tool_res = await tools.search_hcp_tool(query)
        state["tool_result"] = tool_res
        
        # Auto-fill state entities with search database result so the frontend form populates
        if tool_res.get("success") and tool_res.get("results"):
            first_match = tool_res["results"][0]
            entities["doctor_name"] = first_match["name"]
            entities["hospital"] = first_match["hospital"]
            if first_match.get("specialization"):
                entities["specialization"] = first_match["specialization"]

    elif intent == "GENERATE_SUMMARY":
        summary_prompt = prompts.SUMMARY_GENERATION_PROMPT.format(
            doctor_name=entities.get("doctor_name") or "the doctor",
            hospital=entities.get("hospital") or "the hospital",
            products=", ".join(entities.get("products") or []) or "None",
            follow_up_date=entities.get("follow_up_date") or "None",
            notes=entities.get("notes") or "None",
        )
        ai_summary = (await llm.ainvoke(summary_prompt)).content.strip()
        state["tool_result"] = tools.generate_visit_summary_tool(entities, ai_summary)

    elif intent == "SCHEDULE_FOLLOWUP":
        state["tool_result"] = await tools.schedule_followup_tool(
            state.get("interaction_id"),
            entities.get("hcp_id"),
            entities.get("follow_up_date"),
            entities.get("notes"),
        )

    else:  # GENERAL_QUERY
        state["tool_result"] = {"success": True, "message": "No action required."}

    state["entities"] = entities
    return state


# ---------------------------------------------------------------------------
# Node: Database (persistence already happens inside crud.* calls above;
# this node is an explicit checkpoint per the required architecture, and is
# where future auditing/event logging would hook in).
# ---------------------------------------------------------------------------
async def database_node(state: AgentState) -> AgentState:
    if state.get("tool_result", {}).get("success") and state["intent"] == "LOG_INTERACTION":
        state["interaction_id"] = state["tool_result"].get("interaction_id")
    return state


# ---------------------------------------------------------------------------
# Node: Generate Response
# ---------------------------------------------------------------------------
async def generate_response_node(state: AgentState) -> AgentState:
    prompt = prompts.CHAT_RESPONSE_PROMPT.format(
        intent=state["intent"],
        extracted_data=json.dumps(state.get("entities", {})),
        tool_result=json.dumps(state.get("tool_result", {})),
    )
    result = await llm.ainvoke(prompt)
    state["reply"] = result.content.strip()
    return state


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------
def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("intent_detection", intent_detection_node)
    graph.add_node("entity_extraction", entity_extraction_node)
    graph.add_node("tool_execution", tool_execution_node)
    graph.add_node("database", database_node)
    graph.add_node("generate_response", generate_response_node)

    graph.set_entry_point("intent_detection")
    graph.add_edge("intent_detection", "entity_extraction")
    graph.add_edge("entity_extraction", "tool_execution")
    graph.add_edge("tool_execution", "database")
    graph.add_edge("database", "generate_response")
    graph.add_edge("generate_response", END)

    return graph.compile()


agent_graph = build_graph()


async def run_agent(user_id: str, message: str, interaction_id: Optional[str] = None, session_id: Optional[str] = None) -> AgentState:
    """Entry point used by the /chat route."""
    # Load recent chat history for conversational context
    history: List[Dict[str, str]] = []
    accumulated_entities: Dict[str, Any] = {}
    if session_id:
        from app import crud
        recent = await crud.get_chat_history(session_id)
        history = [{"role": r["role"], "content": r["message"]} for r in recent[-10:]]

        # Accumulate previously extracted entities
        for msg in recent:
            if msg.get("role") == "assistant" and msg.get("extracted_data"):
                try:
                    ext = msg.get("extracted_data")
                    data = json.loads(ext) if isinstance(ext, str) else ext
                    if isinstance(data, dict):
                        for k, v in data.items():
                            if v is not None and v != "" and v != []:
                                accumulated_entities[k] = v
                except Exception:
                    pass

    initial_state: AgentState = {
        "message": message,
        "user_id": user_id,
        "interaction_id": interaction_id,
        "history": history,
        "entities": accumulated_entities,
    }
    final_state = await agent_graph.ainvoke(initial_state)
    return final_state
