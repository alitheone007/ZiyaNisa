"""
Bilion AI Router — Multi-brand WhatsApp routing service.

Single entry point for all WhatsApp messages across all brands.
Tenant registry in MongoDB. AI classifies intent, routes to brand API,
generates brand-persona response via Claude.

Endpoints:
  POST /route              — called by n8n gateway for every incoming message
  GET  /tenants            — list active tenants
  POST /tenants            — register a new tenant
  PUT  /tenants/{slug}     — update tenant config
  GET  /session/{phone}    — get user's current brand session
  DELETE /session/{phone}  — clear session (force re-classify next message)
  GET  /health
"""

import os
import json
import httpx
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bilion.router")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("ROUTER_DB_NAME", "bilion_router")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ADMIN_PHONE = os.environ.get("ADMIN_PHONE", "")       # owner's WhatsApp number (with country code, no +)
SESSION_TTL_HOURS = int(os.environ.get("SESSION_TTL_HOURS", "24"))
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

app = FastAPI(title="Bilion AI Router", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str                           # "ziyanisa", "spices", "realtyflow"
    name: str                           # "ZiyaNisa", "Deccan Bezawada Spices"
    description: str                    # used for AI brand classification
    keywords: List[str] = []            # fast keyword matching (pre-AI)
    api_url: str = ""                   # brand's FastAPI base URL for /chat/query
    mode: str = "ai"                    # "ai" | "passthrough"
    passthrough_url: str = ""           # for passthrough: target webhook URL
    persona: str = "Assistant"          # AI name inside responses
    system_prompt: str = ""            # full Claude system prompt for this brand
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    api_url: Optional[str] = None
    mode: Optional[str] = None
    passthrough_url: Optional[str] = None
    persona: Optional[str] = None
    system_prompt: Optional[str] = None
    active: Optional[bool] = None

class RouteRequest(BaseModel):
    phone: str                          # sender phone (no +)
    message: str
    message_type: str = "text"
    customer_name: str = "there"
    phone_number_id: str = ""           # Meta phone_number_id of receiving number
    raw_payload: Optional[dict] = None  # full Meta payload (for passthrough)

class RouteResponse(BaseModel):
    brand: str
    response: str
    persona: str
    mode: str = "ai"                    # "ai" | "passthrough" | "admin"
    passthrough_url: Optional[str] = None
    raw_payload: Optional[dict] = None  # forwarded to passthrough

class UserSession(BaseModel):
    phone: str
    current_tenant: str
    last_active: str
    context: dict = {}


# ── Startup: seed default tenants ─────────────────────────────────────────────

SEED_TENANTS = [
    {
        "id": "tenant-ziyanisa",
        "slug": "ziyanisa",
        "name": "ZiyaNisa",
        "description": "Indian beauty and lifestyle brand — skincare, haircare, makeup, fragrances, jewellery, at-home salon services",
        "keywords": ["skincare", "serum", "moisturizer", "sunscreen", "facial", "salon", "beauty", "haircare", "shampoo",
                     "makeup", "lipstick", "foundation", "fragrance", "ittar", "perfume", "jewellery", "necklace",
                     "booking", "beautician", "spa", "waxing", "threading", "bridal", "mehndi", "ziyanisa"],
        "api_url": "http://backend:8000/api",
        "mode": "ai",
        "persona": "Nisa",
        "system_prompt": (
            "You are Nisa, the friendly WhatsApp assistant for ZiyaNisa — an Indian beauty & lifestyle brand. "
            "You help customers with skincare, haircare, makeup, fragrances, jewellery, and at-home salon service bookings.\n\n"
            "Rules:\n"
            "- Keep responses under 120 words\n"
            "- Use 1-2 emojis max\n"
            "- Be warm, like a knowledgeable beauty advisor friend\n"
            "- For products: https://ziyanisa.com/shop\n"
            "- For service booking: https://ziyanisa.com/services\n"
            "- For order tracking: ask them for their order ID\n"
            "- Sign off: — *Nisa, ZiyaNisa* 💜\n"
            "- NEVER mention any other brand or business"
        ),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "tenant-spices",
        "slug": "spices",
        "name": "Deccan Bezawada Spices",
        "description": "Traditional Indian spices and masalas — biryani masala, chili, turmeric, cumin, podis, pickles",
        "keywords": ["spice", "masala", "biryani", "chili", "chilli", "turmeric", "cumin", "coriander",
                     "pepper", "podi", "pickle", "achaar", "garam", "curry", "fenugreek", "mustard"],
        "api_url": "",
        "mode": "passthrough",
        "passthrough_url": "",          # set to your spice n8n webhook URL
        "persona": "Spice Assistant",
        "system_prompt": "",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

@app.on_event("startup")
async def startup():
    # Indexes
    await db.tenants.create_index([("slug", 1)], unique=True)
    await db.user_sessions.create_index([("phone", 1)], unique=True)
    await db.user_sessions.create_index(
        [("last_active", 1)],
        expireAfterSeconds=SESSION_TTL_HOURS * 3600
    )

    # Seed tenants if not present
    for t in SEED_TENANTS:
        existing = await db.tenants.find_one({"slug": t["slug"]})
        if not existing:
            await db.tenants.insert_one(t)
            log.info(f"Seeded tenant: {t['slug']}")

    log.info("Bilion AI Router started.")


# ── Helpers ───────────────────────────────────────────────────────────────────

async def get_session(phone: str) -> Optional[str]:
    doc = await db.user_sessions.find_one({"phone": phone})
    if not doc:
        return None
    last = datetime.fromisoformat(doc["last_active"].replace("Z", "+00:00"))
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    if (datetime.now(timezone.utc) - last).total_seconds() > SESSION_TTL_HOURS * 3600:
        return None
    return doc.get("current_tenant")

async def save_session(phone: str, brand: str):
    doc = {
        "phone": phone,
        "current_tenant": brand,
        "last_active": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_sessions.update_one({"phone": phone}, {"$set": doc}, upsert=True)

async def get_tenant(slug: str) -> Optional[dict]:
    return await db.tenants.find_one({"slug": slug, "active": True}, {"_id": 0})

async def list_tenants() -> List[dict]:
    return await db.tenants.find({"active": True}, {"_id": 0}).to_list(100)

async def classify_brand(message: str) -> str:
    tenants = await list_tenants()
    if not tenants:
        return "unknown"

    msg_lower = message.lower()

    # Fast keyword match
    for t in tenants:
        for kw in t.get("keywords", []):
            if kw.lower() in msg_lower:
                log.info(f"Keyword match: '{kw}' → {t['slug']}")
                return t["slug"]

    # AI classification (only if API key set)
    if not ANTHROPIC_API_KEY:
        return tenants[0]["slug"]

    tenant_list = "\n".join([f"- {t['slug']}: {t['description']}" for t in tenants])
    try:
        async with httpx.AsyncClient(timeout=8.0) as http:
            resp = await http.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 20,
                    "system": (
                        "You are a brand router. Classify the customer message to exactly one brand.\n"
                        f"Brands:\n{tenant_list}\n\n"
                        "Reply with ONLY the brand slug. Nothing else."
                    ),
                    "messages": [{"role": "user", "content": message}],
                },
            )
            if resp.status_code == 200:
                slug = resp.json()["content"][0]["text"].strip().lower().split()[0]
                if any(t["slug"] == slug for t in tenants):
                    log.info(f"AI classified: '{message[:30]}' → {slug}")
                    return slug
    except Exception as e:
        log.warning(f"Classification error: {e}")

    return tenants[0]["slug"]

async def get_brand_context(api_url: str, message: str, phone: str) -> dict:
    if not api_url:
        return {}
    try:
        async with httpx.AsyncClient(timeout=5.0) as http:
            r = await http.post(
                f"{api_url}/chat/query",
                json={"message": message, "phone": phone},
                timeout=4.0,
            )
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        log.warning(f"Context fetch failed ({api_url}): {e}")
    return {}

async def generate_ai_reply(message: str, customer_name: str, tenant: dict, context: dict) -> str:
    system_prompt = tenant.get("system_prompt") or (
        f"You are a helpful assistant for {tenant['name']}. Keep responses under 120 words. Be warm and concise."
    )
    user_content = f"Customer name: {customer_name}\nMessage: {message}"
    if context:
        user_content += f"\n\nDatabase context:\n{json.dumps(context, default=str)}"

    if not ANTHROPIC_API_KEY:
        return f"Hi {customer_name}! Welcome to {tenant['name']}. How can I help you today?"

    try:
        async with httpx.AsyncClient(timeout=12.0) as http:
            resp = await http.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": CLAUDE_MODEL,
                    "max_tokens": 280,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_content}],
                },
            )
            if resp.status_code == 200:
                return resp.json()["content"][0]["text"].strip()
            log.error(f"Anthropic error {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.error(f"AI reply error: {e}")

    return f"Hi {customer_name}! Thanks for reaching out to {tenant['name']}. How can I help you?"

async def handle_admin_command(cmd: str, phone: str) -> RouteResponse:
    parts = cmd.strip().lower().split()
    verb = parts[0] if parts else ""

    if verb == "/status":
        tenants = await list_tenants()
        lines = ["📊 *Bilion Router Status*\n"]
        for t in tenants:
            mode = "🔁 passthrough" if t.get("mode") == "passthrough" else "🤖 AI"
            lines.append(f"✅ *{t['name']}* (`{t['slug']}`) — {mode}")
        return RouteResponse(brand="admin", response="\n".join(lines), persona="Admin", mode="admin")

    elif verb == "/tenants":
        tenants = await list_tenants()
        lines = [f"*{t['name']}* (`{t['slug']}`)\n_{t['description'][:70]}_" for t in tenants]
        return RouteResponse(
            brand="admin",
            response="🏪 *Active Tenants*\n\n" + "\n\n".join(lines),
            persona="Admin", mode="admin"
        )

    elif verb == "/switch" and len(parts) > 1:
        return await do_switch(phone, parts[1])

    elif verb == "/session" and len(parts) > 1:
        target_phone = parts[1]
        brand = await get_session(target_phone) or "none"
        return RouteResponse(brand="admin", response=f"Session for `{target_phone}`: *{brand}*", persona="Admin", mode="admin")

    elif verb == "/clear" and len(parts) > 1:
        target_phone = parts[1]
        await db.user_sessions.delete_one({"phone": target_phone})
        return RouteResponse(brand="admin", response=f"✅ Session cleared for `{target_phone}`", persona="Admin", mode="admin")

    else:
        help_text = (
            "🔧 *Admin Commands*\n\n"
            "/status — all tenant health\n"
            "/tenants — list active brands\n"
            "/switch {brand} — switch your session\n"
            "/session {phone} — check user session\n"
            "/clear {phone} — clear user session"
        )
        return RouteResponse(brand="admin", response=help_text, persona="Admin", mode="admin")

async def do_switch(phone: str, slug: str) -> RouteResponse:
    tenant = await get_tenant(slug)
    if not tenant:
        tenants = await list_tenants()
        options = ", ".join([f"`{t['slug']}`" for t in tenants])
        return RouteResponse(
            brand="system",
            response=f"❌ Brand `{slug}` not found.\nAvailable: {options}",
            persona="System", mode="admin"
        )
    await save_session(phone, slug)
    return RouteResponse(
        brand=slug,
        response=f"✅ Switched to *{tenant['name']}*. How can I help you?",
        persona=tenant.get("persona", "Assistant"), mode="admin"
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "bilion-ai-router"}

@app.get("/tenants")
async def get_tenants():
    return await list_tenants()

@app.post("/tenants", response_model=Tenant)
async def create_tenant(payload: Tenant):
    existing = await db.tenants.find_one({"slug": payload.slug})
    if existing:
        raise HTTPException(status_code=409, detail=f"Tenant '{payload.slug}' already exists. Use PUT to update.")
    doc = payload.model_dump()
    await db.tenants.insert_one(doc)
    return payload

@app.put("/tenants/{slug}")
async def update_tenant(slug: str, payload: TenantUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.tenants.update_one({"slug": slug}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Tenant '{slug}' not found")
    return {"updated": slug, "fields": list(updates.keys())}

@app.get("/session/{phone}")
async def get_user_session(phone: str):
    doc = await db.user_sessions.find_one({"phone": phone}, {"_id": 0})
    return doc or {"phone": phone, "current_tenant": None}

@app.delete("/session/{phone}")
async def clear_user_session(phone: str):
    await db.user_sessions.delete_one({"phone": phone})
    return {"cleared": phone}

@app.post("/route", response_model=RouteResponse)
async def route_message(payload: RouteRequest):
    phone = payload.phone.strip().lstrip("+")
    message = payload.message.strip()

    log.info(f"Route: {phone} → '{message[:50]}'")

    # Admin commands (owner only)
    if ADMIN_PHONE and phone == ADMIN_PHONE and message.startswith("/"):
        return await handle_admin_command(message, phone)

    # /switch command (any user)
    if message.lower().startswith("/switch "):
        slug = message[8:].strip().lower()
        return await do_switch(phone, slug)

    # /brand command — tell user which brand they're in
    if message.lower() in ("/brand", "/menu", "/help"):
        current = await get_session(phone) or "none"
        tenants = await list_tenants()
        lines = [f"{'✅' if t['slug'] == current else '•'} *{t['name']}* — /switch {t['slug']}" for t in tenants]
        return RouteResponse(
            brand=current,
            response="You're chatting with: *" + (current or "unset") + "*\n\n" + "\n".join(lines),
            persona="Assistant", mode="admin"
        )

    # Get current session
    current_brand = await get_session(phone)

    if not current_brand:
        # Classify brand from message
        current_brand = await classify_brand(message)
        await save_session(phone, current_brand)
    else:
        # Touch session (extend TTL)
        await db.user_sessions.update_one(
            {"phone": phone},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}}
        )

    # Get tenant config
    tenant = await get_tenant(current_brand)
    if not tenant:
        # Fallback: first active tenant
        tenants = await list_tenants()
        tenant = tenants[0] if tenants else None

    if not tenant:
        return RouteResponse(
            brand="unknown",
            response="Sorry, I couldn't identify which service you need. Try /switch {brand-name}.",
            persona="Assistant"
        )

    # Passthrough mode — let the existing workflow handle it end-to-end
    if tenant.get("mode") == "passthrough":
        return RouteResponse(
            brand=current_brand,
            response="",
            persona=tenant.get("persona", "Assistant"),
            mode="passthrough",
            passthrough_url=tenant.get("passthrough_url", ""),
            raw_payload=payload.raw_payload,
        )

    # AI mode — fetch context + generate response
    context = await get_brand_context(tenant.get("api_url", ""), message, phone)
    ai_reply = await generate_ai_reply(message, payload.customer_name, tenant, context)

    return RouteResponse(
        brand=current_brand,
        response=ai_reply,
        persona=tenant.get("persona", "Assistant"),
        mode="ai",
    )
