from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from datetime import timezone
from fastapi import HTTPException
from fastapi import Header
from fastapi import Query
from typing import List
from typing import Optional
import math
import uuid
from core import db, decode_token, token_from_header
from models import AddressCreate, AddressOut, CouponOut, CouponValidateInput, Review, ReviewCreate, SkinProfileCreate, SkinProfileOut, WaitlistCreate, WishlistToggle

# ── Notify-Me Waitlist ─────────────────────────────────────────────────────────

@router.post("/products/{product_id}/notify")
async def notify_when_back(product_id: str, payload: WaitlistCreate):
    doc = {
        "id":         str(uuid.uuid4()),
        "product_id": product_id,
        "contact":    payload.contact,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.waitlist.insert_one(doc)
    return {"success": True}


# ── Reviews ───────────────────────────────────────────────────────────────────

@router.get("/products/{product_id}/reviews")
async def get_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    skip = (page - 1) * limit
    total = await db.reviews.count_documents({"product_id": product_id})
    rows = await db.reviews.find({"product_id": product_id}, {"_id": 0}) \
        .sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    avg = 0.0
    if rows:
        agg = await db.reviews.aggregate([
            {"$match": {"product_id": product_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
        ]).to_list(1)
        avg = round(agg[0]["avg"], 1) if agg else 0.0
    return {"items": rows, "total": total, "page": page,
            "total_pages": max(1, math.ceil(total / limit)), "avg_rating": avg}

@router.post("/products/{product_id}/reviews", response_model=Review)
async def create_review(
    product_id: str,
    payload: ReviewCreate,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1–5")
    if not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    user_doc = await db.users.find_one({"id": claims["sub"]}, {"_id": 0})
    user_name = (user_doc or {}).get("name") or claims.get("contact", "Customer")
    existing = await db.reviews.find_one({"product_id": product_id, "user_id": claims["sub"]})
    if existing:
        raise HTTPException(status_code=409, detail="You have already reviewed this product")
    review = Review(
        product_id=product_id,
        user_id=claims["sub"],
        user_name=user_name,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    doc = review.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.reviews.insert_one(doc)
    return review


# ── Wishlist ──────────────────────────────────────────────────────────────────

@router.get("/wishlist")
async def get_wishlist(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    doc = await db.wishlists.find_one({"user_id": claims["sub"]}, {"_id": 0})
    return doc.get("products", []) if doc else []

@router.post("/wishlist/toggle/{product_id}")
async def toggle_wishlist(
    product_id: str,
    body: WishlistToggle,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    doc = await db.wishlists.find_one({"user_id": uid}, {"_id": 0})
    products = doc.get("products", []) if doc else []
    existing_ids = [p["id"] for p in products]
    if product_id in existing_ids:
        products = [p for p in products if p["id"] != product_id]
        added = False
    else:
        clean = {k: v for k, v in body.product.items() if k != "_id"}
        products.append(clean)
        added = True
    await db.wishlists.update_one(
        {"user_id": uid},
        {"$set": {"products": products, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"added": added, "count": len(products)}


# ── Address Book ──────────────────────────────────────────────────────────────

@router.get("/addresses", response_model=List[AddressOut])
async def list_addresses(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    rows = await db.addresses.find({"user_id": claims["sub"]}, {"_id": 0}).sort("created_at", 1).to_list(10)
    return rows

@router.post("/addresses", response_model=AddressOut)
async def create_address(payload: AddressCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    if payload.is_default:
        await db.addresses.update_many({"user_id": uid}, {"$set": {"is_default": False}})
    count = await db.addresses.count_documents({"user_id": uid})
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "is_default": payload.is_default or count == 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    }
    await db.addresses.insert_one(doc)
    return doc

@router.patch("/addresses/{addr_id}/default")
async def set_default_address(addr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    await db.addresses.update_many({"user_id": uid}, {"$set": {"is_default": False}})
    result = await db.addresses.update_one({"id": addr_id, "user_id": uid}, {"$set": {"is_default": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"id": addr_id, "is_default": True}

@router.delete("/addresses/{addr_id}")
async def delete_address(addr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    result = await db.addresses.delete_one({"id": addr_id, "user_id": claims["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"deleted": True}


# ── Coupons ───────────────────────────────────────────────────────────────────

def _compute_discount(coupon: dict, total: int) -> int:
    if coupon["type"] == "flat":
        return min(coupon["value"], total)
    if coupon["type"] in ("percent", "first_order"):
        disc = int(total * coupon["value"] / 100)
        if coupon.get("max_discount"):
            disc = min(disc, coupon["max_discount"])
        return min(disc, total)
    return 0

def _coupon_label(coupon: dict) -> str:
    if coupon["type"] == "flat":
        return f"₹{coupon['value']} off"
    if coupon["type"] in ("percent", "first_order"):
        s = f"{coupon['value']}% off"
        if coupon.get("max_discount"):
            s += f" (max ₹{coupon['max_discount']})"
        return s
    return "Discount applied"

@router.post("/coupons/validate", response_model=CouponOut)
async def validate_coupon(payload: CouponValidateInput, authorization: Optional[str] = Header(None)):
    code = payload.code.strip().upper()
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found or expired")
    if payload.total < coupon.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{coupon['min_order']} required for this coupon")
    if coupon["type"] == "first_order" and authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            past = await db.orders.count_documents({"user_id": claims["sub"]})
            if past > 0:
                raise HTTPException(status_code=400, detail="This coupon is for first-time orders only")
        except HTTPException as exc:
            raise exc
        except Exception:
            pass
    disc = _compute_discount(coupon, payload.total)
    return CouponOut(
        code=code, type=coupon["type"], value=coupon["value"],
        min_order=coupon.get("min_order", 0), max_discount=coupon.get("max_discount"),
        discount=disc, final_total=max(0, payload.total - disc), label=_coupon_label(coupon),
    )

@router.get("/coupons/best")
async def best_coupon(total: int = Query(..., ge=1), authorization: Optional[str] = Header(None)):
    coupons = await db.coupons.find({"active": True, "min_order": {"$lte": total}}, {"_id": 0}).to_list(50)
    if not coupons:
        return None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            past = await db.orders.count_documents({"user_id": claims["sub"]})
            if past > 0:
                coupons = [c for c in coupons if c["type"] != "first_order"]
        except Exception:
            pass
    if not coupons:
        return None
    best = max(coupons, key=lambda c: _compute_discount(c, total))
    disc = _compute_discount(best, total)
    if disc == 0:
        return None
    return CouponOut(
        code=best["code"], type=best["type"], value=best["value"],
        min_order=best.get("min_order", 0), max_discount=best.get("max_discount"),
        discount=disc, final_total=max(0, total - disc), label=_coupon_label(best),
    )


# ── Skin Profile ──────────────────────────────────────────────────────────────

@router.get("/skin-profile")
async def get_skin_profile(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    doc = await db.skin_profiles.find_one({"user_id": claims["sub"]}, {"_id": 0})
    return doc

@router.post("/skin-profile", response_model=SkinProfileOut)
async def save_skin_profile(payload: SkinProfileCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    }
    await db.skin_profiles.update_one({"user_id": uid}, {"$set": doc}, upsert=True)
    return doc


