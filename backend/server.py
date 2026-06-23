"""
ZiyaNisa — FastAPI backend.

PHASE 1 (current):
  - Visual preview homepage. Backend exposes seed/mock endpoints that mirror
    the data shape used by the React frontend, so the homepage can be wired
    to real APIs progressively.

PENDING (next AI / phases):
  - Auth (JWT email/password — call integration_playbook_expert_v2 first)
  - Real product, category, cart, order, wishlist, review CRUD with MongoDB
  - At-home service booking engine (matching, slots, OTPs)
  - Beautician + vendor onboarding workflows + admin approval queue
  - Admin dashboard endpoints (RBAC)
  - Payment provider integration (Razorpay/Paytm — placeholders in .env)
  - File/image upload (S3-style)

A full Postgres-style data model reference is in
`/app/backend/sql_schema_reference.sql` for local SQL testing.
"""

from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="ZiyaNisa API", version="0.1.0")
api_router = APIRouter(prefix="/api")


# =========================================================================
# Health / status (kept from template)
# =========================================================================
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "ZiyaNisa API · K-Glow Beauty, Deccan Grace, Delivered to You."}


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "ziyanisa-api", "version": "0.1.0"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r["timestamp"], str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


# =========================================================================
# Seed / preview models — mirror frontend mocks so the UI can switch over
# to real endpoints without changing shape.
# PENDING(next-AI): persist these to MongoDB collections and add CRUD.
# =========================================================================
class Category(BaseModel):
    id: str
    label: str
    img: str


class Product(BaseModel):
    id: str
    name: str
    brand: str
    price: int
    mrp: int
    rating: float
    reviews: int
    img: str
    badges: List[str] = []
    actives: List[str] = []
    category_id: Optional[str] = None


class Service(BaseModel):
    id: str
    name: str
    duration: str
    price: int
    rating: float
    img: str
    level: str
    tag: str


CATEGORIES_SEED: List[dict] = [
    {"id": "skincare", "label": "Skincare", "img": "https://images.pexels.com/photos/8131568/pexels-photo-8131568.jpeg"},
    {"id": "haircare", "label": "Haircare", "img": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80"},
    {"id": "makeup", "label": "Makeup", "img": "https://images.unsplash.com/photo-1522335789203-aaa2f6b6d3a4?w=800&q=80"},
    {"id": "bath-body", "label": "Bath & Body", "img": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80"},
    {"id": "fragrance", "label": "Fragrance & Ittar", "img": "https://images.unsplash.com/photo-1458538977777-0549b2370168?w=800&q=80"},
    {"id": "jewellery", "label": "Jewellery", "img": "https://images.unsplash.com/photo-1693212793204-bcea856c75fe?w=800&q=80"},
    {"id": "handbags", "label": "Handbags", "img": "https://images.unsplash.com/photo-1705909237050-7a7625b47fac?w=800&q=80"},
    {"id": "tools", "label": "Beauty Tools", "img": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80"},
    {"id": "mens", "label": "Men's Grooming", "img": "https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?w=800&q=80"},
    {"id": "bridal", "label": "Bridal & Occasion", "img": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"},
]

PRODUCTS_SEED: List[dict] = [
    {"id": "p1", "name": "SPF 50 Glow Shield", "brand": "SeoulSaffron", "price": 1299, "mrp": 1599,
     "rating": 4.7, "reviews": 1284, "img": "https://images.unsplash.com/photo-1623676714504-edd78728155e?w=800&q=80",
     "badges": ["K-Glow", "Clean Pick"], "actives": ["Saffron", "Niacinamide", "Ceramide"], "category_id": "skincare"},
    {"id": "p2", "name": "10% Niacinamide Serum", "brand": "NoorActives", "price": 749, "mrp": 999,
     "rating": 4.8, "reviews": 3210, "img": "https://images.pexels.com/photos/35899861/pexels-photo-35899861.jpeg",
     "badges": ["Derm-Backed", "Vegan"], "actives": ["Niacinamide", "Zinc"], "category_id": "skincare"},
    {"id": "p3", "name": "Ceramide Barrier Cream", "brand": "PearlRoot", "price": 1099, "mrp": 1399,
     "rating": 4.6, "reviews": 942, "img": "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80",
     "badges": ["K-Glow", "Fragrance-Free"], "actives": ["Ceramide", "Hyaluronic Acid"], "category_id": "skincare"},
    {"id": "p4", "name": "Rice Water Gel Cleanser", "brand": "AquaZiya", "price": 549, "mrp": 699,
     "rating": 4.5, "reviews": 1820, "img": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80",
     "badges": ["Korean-Inspired"], "actives": ["Rice Water", "Centella"], "category_id": "skincare"},
]

SERVICES_SEED: List[dict] = [
    {"id": "s1", "name": "Korean Glow Facial", "duration": "75 min", "price": 1499, "rating": 4.9,
     "img": "https://images.pexels.com/photos/30809943/pexels-photo-30809943.jpeg", "level": "Senior", "tag": "K-Glow"},
    {"id": "s2", "name": "Saffron Brightening Cleanup", "duration": "45 min", "price": 799, "rating": 4.7,
     "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80", "level": "Trained", "tag": "Best Seller"},
    {"id": "s3", "name": "Bridal Noor Makeup", "duration": "180 min", "price": 11999, "rating": 4.9,
     "img": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80", "level": "Bridal Expert", "tag": "Bridal"},
    {"id": "s4", "name": "Pearl Pedicure", "duration": "60 min", "price": 899, "rating": 4.6,
     "img": "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80", "level": "Trained", "tag": "Relax"},
]


@api_router.get("/seed/categories", response_model=List[Category])
async def seed_categories():
    return CATEGORIES_SEED


@api_router.get("/seed/products", response_model=List[Product])
async def seed_products():
    return PRODUCTS_SEED


@api_router.get("/seed/services", response_model=List[Service])
async def seed_services():
    return SERVICES_SEED


# =========================================================================
# Product / Category / Service CRUD endpoints.
# Currently served from in-memory seed data.
# PENDING(next-AI): replace seed lists with MongoDB read/write operations.
# =========================================================================
from fastapi import HTTPException, Query


@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    return CATEGORIES_SEED


@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = Query(None)):
    if category:
        return [p for p in PRODUCTS_SEED if p.get("category_id") == category]
    return PRODUCTS_SEED


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@api_router.get("/services", response_model=List[Service])
async def get_services():
    return SERVICES_SEED


# =========================================================================
# Lead capture endpoints (waitlist + newsletter)
# Stored in MongoDB so leads survive restarts even at MVP stage.
# =========================================================================
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    source: str  # "ittar_waitlist" | "newsletter"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeadCreate(BaseModel):
    email: str
    source: str


@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    lead = Lead(**payload.model_dump())
    doc = lead.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leads.insert_one(doc)
    return lead


# =========================================================================
# Payments — PLACEHOLDER MODULE (NOT IMPLEMENTED YET).
# Reads provider keys from environment so the next AI can drop in
# Razorpay / Paytm without touching auth or routing.
# Required env vars (already declared in /app/backend/.env as empty):
#   - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
#   - PAYTM_MERCHANT_ID,  PAYTM_MERCHANT_KEY,  PAYTM_WEBSITE, PAYTM_INDUSTRY_TYPE
# PENDING(next-AI):
#   1. call integration_playbook_expert_v2 for Razorpay + Paytm playbooks
#   2. implement create_order / verify_signature / webhook handlers
#   3. wire to /api/orders + /api/bookings on confirmation
# =========================================================================
PAYMENT_PROVIDERS = {
    "razorpay": {
        "enabled": bool(os.environ.get("RAZORPAY_KEY_ID")),
        "key_id_env": "RAZORPAY_KEY_ID",
    },
    "paytm": {
        "enabled": bool(os.environ.get("PAYTM_MERCHANT_ID")),
        "merchant_id_env": "PAYTM_MERCHANT_ID",
    },
}


@api_router.get("/payments/providers")
async def payment_providers():
    """Returns which payment providers have keys configured (no secrets)."""
    return PAYMENT_PROVIDERS


# Register router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
