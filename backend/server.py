"""
ZiyaNisa — FastAPI backend. Composition root.

Domain logic lives in routers/ (one module per domain), shared config/DB/auth
in core.py, Pydantic models in models.py, seed catalog in seeds.py. This file
only assembles the app: routers, middleware, static mounts, startup indexes.
Route paths are identical to the pre-split monolith (verified by route-table
diff at refactor time).
"""
import logging
import os

from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from core import db, client, UPLOADS_DIR, token_from_header, is_admin_claims
from seeds import COUPON_SEEDS
from datetime import datetime, timezone

from routers import (
    catalog, auth, orders, admin, account, chat,
    beauticians, community, seo,
)
from routers.beauticians import BEAUTICIANS_SEED, _h3_cell
from amazon_pipeline import make_amazon_router

app = FastAPI(title="ZiyaNisa API", version="0.1.0")
api_router = APIRouter(prefix="/api")

for domain in (catalog, auth, orders, admin, account, chat, beauticians, community, seo):
    api_router.include_router(domain.router)
api_router.include_router(make_amazon_router(db, token_from_header, is_admin_claims))

app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

@app.on_event("startup")
async def create_indexes():
    await db.products.create_index([("category_id", 1)])
    await db.products.create_index([("name", "text"), ("brand", "text"), ("actives", "text")])
    await db.products.create_index([("price", 1)])
    await db.orders.create_index([("user_id", 1)])
    await db.orders.create_index([("created_at", -1)])
    await db.users.create_index([("contact", 1)], unique=True, sparse=True)
    await db.users.create_index([("phone", 1)], sparse=True)
    await db.chat_sessions.create_index([("phone", 1)], unique=True)
    await db.reviews.create_index([("product_id", 1), ("user_id", 1)], unique=True)
    await db.wishlists.create_index([("user_id", 1)], unique=True)
    await db.addresses.create_index([("user_id", 1)])
    await db.skin_profiles.create_index([("user_id", 1)], unique=True)
    await db.coupons.create_index([("code", 1)], unique=True)
    await db.waitlist.create_index([("product_id", 1)])
    await db.products.create_index([("id", 1)], unique=True, sparse=True)
    await db.transactions.create_index([("transaction_id", 1)], unique=True)
    await db.payment_verifications.create_index([("transaction_id", 1)], unique=True)
    # Seed coupons if missing
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([{**c} for c in COUPON_SEEDS])
    # Auto-expire idle chat sessions after 7 days
    await db.chat_sessions.create_index([("last_active", 1)], expireAfterSeconds=604800)
    await db.bookings.create_index([("user_id", 1)])
    await db.bookings.create_index([("created_at", -1)])
    await db.bookings.create_index([("date", 1)])
    await db.bookings.create_index([("beautician_id", 1)])
    await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
    # Beauticians
    await db.beauticians.create_index([("h3_index", 1)])
    await db.beauticians.create_index([("area", 1)])
    await db.beauticians.create_index([("active", 1)])
    await db.beauticians.create_index([("on_duty", 1)])
    await db.beauticians.create_index([("phone", 1)])
    await db.beautician_applications.create_index([("phone", 1)])
    await db.beautician_applications.create_index([("status", 1)])
    await db.beautician_applications.create_index([("created_at", -1)])
    await db.bug_reports.create_index([("status", 1)])
    await db.bug_reports.create_index([("severity", 1)])
    await db.bug_reports.create_index([("reported_at", -1)])
    await db.bug_reports.create_index([("category", 1)])
    await db.feature_requests.create_index([("status", 1)])
    await db.feature_requests.create_index([("priority", 1)])
    await db.feature_requests.create_index([("reported_at", -1)])
    await db.feature_requests.create_index([("category", 1)])
    if await db.beauticians.count_documents({}) == 0:
        seeded_b = []
        for b in BEAUTICIANS_SEED:
            seeded_b.append({**b, "h3_index": _h3_cell(b["lat"], b["lng"]), "created_at": datetime.now(timezone.utc).isoformat()})
        await db.beauticians.insert_many(seeded_b)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
