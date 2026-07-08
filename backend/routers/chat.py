from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from datetime import timezone
from fastapi import HTTPException
from fastapi import Header
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field
from typing import Optional
import uuid
from core import db, decode_token, token_from_header
from seeds import SERVICES_SEED

# ── Chat / AI context ────────────────────────────────────────────────────────

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    service_name: str
    service_price: int
    service_duration: str
    date: str
    time_slot: str
    address: dict
    notes: Optional[str] = None
    status: str = "confirmed"
    upi_ref: Optional[str] = None
    user_id: Optional[str] = None
    beautician_id: Optional[str] = None
    beautician_name: Optional[str] = None
    expansion_ring: Optional[int] = None
    rating: Optional[int] = None
    rating_comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingRating(BaseModel):
    rating: int       # 1–5
    comment: str = ""

class BookingCreate(BaseModel):
    service_id: str
    service_name: str
    service_price: int
    service_duration: str
    date: str
    time_slot: str
    address: dict
    notes: Optional[str] = None
    beautician_id: Optional[str] = None
    beautician_name: Optional[str] = None
    expansion_ring: Optional[int] = None

@router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, authorization: Optional[str] = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            user_id = claims.get("sub")
        except Exception:
            pass
    # Idempotency: a confirm that timed out client-side and was retried must
    # not create a duplicate booking for the same user/service/date/slot.
    if user_id:
        dup = await db.bookings.find_one({
            "user_id": user_id, "service_id": payload.service_id,
            "date": payload.date, "time_slot": payload.time_slot,
            "status": {"$ne": "cancelled"},
        }, {"_id": 0})
        if dup:
            return dup
    booking = Booking(**payload.model_dump(), user_id=user_id)
    await db.bookings.insert_one(booking.model_dump())
    doc = await db.bookings.find_one({"id": booking.id}, {"_id": 0})
    return doc

@router.get("/bookings/mine")
async def my_bookings(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    user_id = claims["sub"]
    docs = await db.bookings.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@router.patch("/bookings/{booking_id}/rate")
async def rate_booking(booking_id: str, payload: BookingRating, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1–5")
    booking = await db.bookings.find_one({"id": booking_id, "user_id": claims["sub"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only rate completed bookings")
    if booking.get("rating") is not None:
        raise HTTPException(status_code=409, detail="Already rated")

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"rating": payload.rating, "rating_comment": payload.comment.strip()}},
    )

    if booking.get("beautician_id"):
        b_doc = await db.beauticians.find_one({"id": booking["beautician_id"]}, {"_id": 0})
        if b_doc:
            old_rating = float(b_doc.get("rating") or 4.5)
            old_count  = int(b_doc.get("rating_count") or 10)
            new_count  = old_count + 1
            new_avg    = round((old_rating * old_count + payload.rating) / new_count, 2)
            await db.beauticians.update_one(
                {"id": booking["beautician_id"]},
                {"$set": {"rating": new_avg, "rating_count": new_count}},
            )

    return {"id": booking_id, "rating": payload.rating}


class ChatQueryInput(BaseModel):
    message: str
    phone: str
    context: Optional[dict] = None

class ChatSessionUpdate(BaseModel):
    phone: str
    business: str           # "ziyanisa" | "spices" | "unknown"
    context: Optional[dict] = None

@router.post("/chat/query")
async def chat_query(payload: ChatQueryInput):
    msg = payload.message.lower()
    results: dict = {"products": [], "services": [], "orders": [], "intent": "general", "business": "ziyanisa"}

    # Product context (up to 3 most relevant)
    p_query: dict = {"$or": [
        {"name":      {"$regex": msg, "$options": "i"}},
        {"brand":     {"$regex": msg, "$options": "i"}},
        {"category_id": {"$regex": msg.replace(" ", "-"), "$options": "i"}},
        {"actives":   {"$elemMatch": {"$regex": msg, "$options": "i"}}},
    ]}
    results["products"] = await db.products.find(p_query, {"_id": 0}).limit(3).to_list(3)

    # Service context (fall back to seed if DB empty)
    s_query: dict = {"$or": [
        {"name": {"$regex": msg, "$options": "i"}},
        {"tag":  {"$regex": msg, "$options": "i"}},
    ]}
    db_svcs = await db.services.find(s_query, {"_id": 0}).limit(3).to_list(3)
    if not db_svcs:
        db_svcs = [s for s in SERVICES_SEED if msg in s.get("name", "").lower() or msg in s.get("tag", "").lower()][:3]
    results["services"] = db_svcs

    # Order lookup by phone (last 10 digits)
    phone_digits = "".join(c for c in payload.phone if c.isdigit())[-10:]
    if phone_digits:
        user = await db.users.find_one({"phone": {"$regex": phone_digits}}, {"_id": 0})
        if user:
            results["orders"] = await db.orders.find(
                {"user_id": user["id"]}, {"_id": 0}
            ).sort("created_at", -1).limit(3).to_list(3)

    # Intent classification
    if any(w in msg for w in ["order", "track", "status", "delivery", "dispatch", "where is my"]):
        results["intent"] = "order_status"
    elif any(w in msg for w in ["book", "appointment", "facial", "salon", "service", "beautician", "massage"]):
        results["intent"] = "service_booking"
    elif any(w in msg for w in ["price", "cost", "rate", "how much", "charges"]):
        results["intent"] = "pricing"
    elif any(w in msg for w in ["return", "refund", "cancel", "complaint", "damaged", "wrong item"]):
        results["intent"] = "support"
    elif any(w in msg for w in ["skincare", "haircare", "makeup", "fragrance", "serum", "cream", "oil", "ittar"]):
        results["intent"] = "product_discovery"
    else:
        results["intent"] = "general"

    return results

@router.get("/chat/session/{phone}")
async def get_chat_session(phone: str):
    session = await db.chat_sessions.find_one({"phone": phone}, {"_id": 0})
    return session or {"phone": phone, "business": "unknown", "context": {}}

@router.post("/chat/session")
async def upsert_chat_session(payload: ChatSessionUpdate):
    doc = {
        "phone": payload.phone,
        "business": payload.business,
        "context": payload.context or {},
        "last_active": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_sessions.update_one({"phone": payload.phone}, {"$set": doc}, upsert=True)
    return doc


