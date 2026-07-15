"""
MongoDB connection setup using Motor (the async MongoDB driver).

All collections are exposed as module-level handles so the rest of the
app can simply do `from app.database import db` and access `db.users`,
`db.hcps`, etc.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "ai_hcp_crm")

client = AsyncIOMotorClient(MONGO_URI)
db = client[MONGO_DB_NAME]

# Collection handles
users_collection = db["users"]
hcps_collection = db["hcps"]
interactions_collection = db["interactions"]
products_collection = db["products"]
followups_collection = db["followups"]
chat_history_collection = db["chat_history"]


async def init_indexes():
    """Create indexes required for uniqueness and fast lookups. Called on app startup."""
    await users_collection.create_index("email", unique=True)
    await hcps_collection.create_index([("name", 1), ("hospital", 1)])
    await products_collection.create_index("name", unique=True)
    await interactions_collection.create_index("created_by")
    await interactions_collection.create_index("hcp_id")
    await followups_collection.create_index("due_date")
    await chat_history_collection.create_index("session_id")
