from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from fastapi import HTTPException
from fastapi import Header
from fastapi import Query
from typing import List
from typing import Optional
import math
from core import db, decode_token
from models import Category, Product, ProductsPage, Service, StatusCheck, StatusCheckCreate
from seeds import CATEGORIES_SEED, CONCERN_ACTIVES, PRODUCTS_SEED, SERVICES_SEED

# ── Health endpoints ───────────────────────────────────────────────────────────

@router.get("/")
async def root():
    return {"message": "ZiyaNisa API · K-Glow Beauty, Deccan Grace, Delivered to You."}

@router.get("/health")
async def health():
    return {"status": "ok", "service": "ziyanisa-api", "version": "0.1.0"}

@router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    obj = StatusCheck(**input.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj

@router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r["timestamp"], str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


# ── Catalog endpoints ──────────────────────────────────────────────────────────

@router.get("/categories", response_model=List[Category])
async def get_categories():
    # Merge DB + seeds (DB wins on id clash) — either/or made the first
    # admin-created category silently replace all 10 seed categories.
    cats = await db.categories.find({}, {"_id": 0}).to_list(50)
    db_ids = {c["id"] for c in cats}
    return cats + [c for c in CATEGORIES_SEED if c["id"] not in db_ids]

SORT_MAP = {
    "rating":     [("rating", -1)],
    "reviews":    [("reviews", -1)],
    "price_asc":  [("price",  1)],
    "price_desc": [("price", -1)],
}

@router.get("/products", response_model=ProductsPage)
async def get_products(
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),   # rating | reviews | price_asc | price_desc
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    # Fetch all DB products (no pagination yet — we merge with seeds in Python)
    db_all = await db.products.find({}, {"_id": 0}).to_list(10000)
    db_ids = {p["id"] for p in db_all}

    # Fill in seed products whose IDs are not yet in the DB
    seed_extras = [p for p in PRODUCTS_SEED if p["id"] not in db_ids]
    all_products = db_all + seed_extras

    # Apply filters
    if category:
        all_products = [p for p in all_products if p.get("category_id") == category]
    if q:
        ql = q.lower()
        all_products = [
            p for p in all_products
            if ql in p.get("name", "").lower()
            or ql in p.get("brand", "").lower()
            or any(ql in a.lower() for a in p.get("actives", []))
        ]

    # Sort
    if sort == "rating":      all_products.sort(key=lambda p: p.get("rating", 0),  reverse=True)
    elif sort == "reviews":   all_products.sort(key=lambda p: p.get("reviews", 0), reverse=True)
    elif sort == "price_asc": all_products.sort(key=lambda p: p.get("price", 0))
    elif sort == "price_desc":all_products.sort(key=lambda p: p.get("price", 0),  reverse=True)

    total = len(all_products)
    skip  = (page - 1) * limit
    items = all_products[skip: skip + limit]
    return {"items": items, "total": total, "page": page, "total_pages": max(1, math.ceil(total / limit))}

@router.get("/products/for-me", response_model=ProductsPage)
async def products_for_me(
    limit: int = Query(8, ge=1, le=20),
    authorization: Optional[str] = Header(None),
):
    """Return products ranked by match to the user's skin profile."""
    profile = None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            profile = await db.skin_profiles.find_one({"user_id": claims["sub"]}, {"_id": 0})
        except Exception:
            pass

    all_products = await db.products.find({}, {"_id": 0}).to_list(500)
    if not all_products:
        all_products = PRODUCTS_SEED

    if not profile:
        # No profile — return top skincare/haircare by rating
        care = [p for p in all_products if p.get("category_id") in ("skincare", "haircare", "bath-body")]
        care = sorted(care, key=lambda p: p.get("rating", 0), reverse=True)[:limit]
        return {"items": care, "total": len(care), "page": 1, "total_pages": 1}

    # Build keyword set from skin type + concerns
    keywords: set = set()
    keywords.update(CONCERN_ACTIVES.get(profile.get("skin_type", ""), []))
    for concern in profile.get("concerns", []):
        keywords.update(CONCERN_ACTIVES.get(concern, []))

    def score(p: dict) -> float:
        actives = [a.lower() for a in p.get("actives", [])]
        name = p.get("name", "").lower()
        match_count = sum(1 for kw in keywords if any(kw in a for a in actives) or kw in name)
        return match_count * 10 + p.get("rating", 0)

    scored = sorted(all_products, key=score, reverse=True)[:limit]
    return {"items": scored, "total": len(scored), "page": 1, "total_pages": 1}


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/services", response_model=List[Service])
async def get_services():
    # Same merge as categories/products — the first admin-created service
    # must not hide the seed services.
    svcs = await db.services.find({}, {"_id": 0}).to_list(100)
    db_ids = {s["id"] for s in svcs}
    return svcs + [s for s in SERVICES_SEED if s["id"] not in db_ids]


