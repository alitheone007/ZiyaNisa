from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from datetime import timedelta
from datetime import timezone
from fastapi import File
from fastapi import HTTPException
from fastapi import Header
from fastapi import Query
from fastapi import UploadFile
from otp_sender import deliver_notification
from typing import Optional
import asyncio
import math
import uuid
from core import UPLOADS_DIR, db, is_admin_claims, token_from_header
from models import CategoryCreate, CategoryUpdate, ProductCreate, ProductUpdate, ServiceCreate, ServiceUpdate
from seeds import CATEGORIES_SEED, COUPON_SEEDS, PRODUCTS_SEED, SERVICES_SEED

# ── DB seed helper ────────────────────────────────────────────────────────────

@router.post("/admin/seed-db")
async def seed_db():
    """Insert seed data into MongoDB (idempotent — skips if already present)."""
    seeded = []
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([{**p} for p in PRODUCTS_SEED])
        seeded.append(f"{len(PRODUCTS_SEED)} products")
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([{**c} for c in CATEGORIES_SEED])
        seeded.append(f"{len(CATEGORIES_SEED)} categories")
    if await db.services.count_documents({}) == 0:
        await db.services.insert_many([{**s} for s in SERVICES_SEED])
        seeded.append(f"{len(SERVICES_SEED)} services")
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([{**c} for c in COUPON_SEEDS])
        seeded.append(f"{len(COUPON_SEEDS)} coupons")
    if seeded:
        return {"message": f"Seeded: {', '.join(seeded)}."}
    return {"message": "Already seeded. Skipped."}


# ── Admin endpoints ───────────────────────────────────────────────────────────

ORDER_STATUSES   = {"pending_payment", "payment_confirmed", "dispatched", "delivered", "cancelled"}
BOOKING_STATUSES = {"confirmed", "in_progress", "completed", "cancelled"}

@router.get("/admin/orders")
async def admin_all_orders(
    authorization: Optional[str] = Header(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    skip = (page - 1) * limit
    total = await db.orders.count_documents({})
    rows = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": rows, "total": total, "page": page, "total_pages": math.ceil(total / limit) or 1}

@router.patch("/admin/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    status = body.get("status", "")
    if status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {sorted(ORDER_STATUSES)}")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    if status in ("dispatched", "delivered"):
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order and order.get("user_id"):
            user = await db.users.find_one({"id": order["user_id"]}, {"_id": 0})
            if user and user.get("contact"):
                short_id = order_id[:8].upper()
                if status == "dispatched":
                    tracking = order.get("tracking_url", "")
                    plain = (f"Your ZiyaNisa order #{short_id} has been dispatched!\n"
                             + (f"Track here: {tracking}" if tracking else "You'll receive it soon."))
                else:
                    plain = f"Your ZiyaNisa order #{short_id} has been delivered. We hope you love it! Thank you for shopping with us."
                html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#2C1A0E">ZiyaNisa</h2>
  <p style="color:#333">{plain.replace(chr(10), '<br>')}</p>
</div>"""
                subject = f"Order #{short_id} {'Dispatched' if status == 'dispatched' else 'Delivered'} — ZiyaNisa"
                asyncio.create_task(deliver_notification(user["contact"], subject, plain, html))

    return {"id": order_id, "status": status}

@router.get("/admin/bookings")
async def admin_all_bookings(
    authorization: Optional[str] = Header(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    skip = (page - 1) * limit
    total = await db.bookings.count_documents({})
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": rows, "total": total, "page": page, "total_pages": math.ceil(total / limit) or 1}

@router.patch("/admin/bookings/{booking_id}/status")
async def admin_update_booking_status(
    booking_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    status = body.get("status", "")
    if status not in BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {sorted(BOOKING_STATUSES)}")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")

    if status in ("in_progress", "completed"):
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if booking and booking.get("user_id"):
            user = await db.users.find_one({"id": booking["user_id"]}, {"_id": 0})
            if user and user.get("contact"):
                svc = booking.get("service_name", "your appointment")
                if status == "in_progress":
                    plain = f"Your {svc} has started! Your ZiyaNisa beautician is with you."
                else:
                    plain = f"Your {svc} is complete. We hope you had a wonderful experience! Open the ZiyaNisa app to rate your beautician."
                html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#2C1A0E">ZiyaNisa</h2>
  <p style="color:#333">{plain}</p>
</div>"""
                subject = f"{'Appointment Started' if status == 'in_progress' else 'Appointment Complete'} — ZiyaNisa"
                asyncio.create_task(deliver_notification(user["contact"], subject, plain, html))

    return {"id": booking_id, "status": status}


# ── Admin — Product CRUD ───────────────────────────────────────────────────────

@router.post("/admin/products")
async def admin_create_product(payload: ProductCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    product_id = f"p-{str(uuid.uuid4())[:8]}"
    doc = {"id": product_id, **payload.model_dump()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, payload: ProductUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        seed_product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
        if seed_product:
            await db.products.insert_one({**seed_product, **update})
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        await db.products.update_one({"id": product_id}, {"$set": update})
    return await db.products.find_one({"id": product_id}, {"_id": 0})

@router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.products.delete_one({"id": product_id})
    await db.deleted_products.update_one(
        {"product_id": product_id},
        {"$set": {"product_id": product_id, "deleted_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"deleted": True, "id": product_id}

@router.patch("/admin/products/{product_id}/stock")
async def toggle_stock(product_id: str, body: dict, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    in_stock = body.get("in_stock", True)
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        seed_product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
        if seed_product:
            await db.products.insert_one({**seed_product, "in_stock": in_stock})
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        await db.products.update_one({"id": product_id}, {"$set": {"in_stock": in_stock}})
    return {"id": product_id, "in_stock": in_stock}


# ── Admin — Services CRUD ─────────────────────────────────────────────────────

@router.post("/admin/services")
async def admin_create_service(payload: ServiceCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    service_id = f"s-{str(uuid.uuid4())[:8]}"
    doc = {"id": service_id, **payload.model_dump()}
    await db.services.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/admin/services/{service_id}")
async def admin_update_service(service_id: str, payload: ServiceUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    existing = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        seed_svc = next((s for s in SERVICES_SEED if s["id"] == service_id), None)
        if seed_svc:
            await db.services.insert_one({**seed_svc, **update})
        else:
            raise HTTPException(status_code=404, detail="Service not found")
    else:
        await db.services.update_one({"id": service_id}, {"$set": update})
    return await db.services.find_one({"id": service_id}, {"_id": 0})

@router.delete("/admin/services/{service_id}")
async def admin_delete_service(service_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.services.delete_one({"id": service_id})
    return {"deleted": True, "id": service_id}


# ── Admin — Categories CRUD ────────────────────────────────────────────────────

@router.post("/admin/categories")
async def admin_create_category(payload: CategoryCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    if await db.categories.find_one({"id": payload.id}):
        raise HTTPException(status_code=409, detail=f"Category ID '{payload.id}' already exists")
    doc = payload.model_dump()
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, payload: CategoryUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        seed_cat = next((c for c in CATEGORIES_SEED if c["id"] == category_id), None)
        if seed_cat:
            await db.categories.insert_one({**seed_cat, **update})
        else:
            raise HTTPException(status_code=404, detail="Category not found")
    else:
        await db.categories.update_one({"id": category_id}, {"$set": update})
    return await db.categories.find_one({"id": category_id}, {"_id": 0})

@router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.categories.delete_one({"id": category_id})
    return {"deleted": True, "id": category_id}


# ── Admin — Image upload (local storage, served at /api/uploads/) ─────────────

@router.post("/admin/upload-image")
async def admin_upload_image(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large — max 10 MB")
    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    (UPLOADS_DIR / filename).write_bytes(data)
    return {"url": f"/api/uploads/{filename}"}


# ── Admin — Analytics ──────────────────────────────────────────────────────────

@router.get("/admin/analytics")
async def admin_analytics(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")

    paid = ["payment_confirmed", "dispatched", "delivered"]
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    rev_agg = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    total_revenue = rev_agg[0]["total"] if rev_agg else 0
    total_orders  = rev_agg[0]["count"] if rev_agg else 0

    week_agg = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}, "created_at": {"$gte": seven_days_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    revenue_this_week = week_agg[0]["total"] if week_agg else 0
    orders_this_week  = week_agg[0]["count"] if week_agg else 0

    top_products = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id":      "$items.id",
            "name":     {"$first": "$items.name"},
            "qty_sold": {"$sum":   "$items.qty"},
            "revenue":  {"$sum":   {"$multiply": ["$items.qty", "$items.price"]}},
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
    ]).to_list(5)

    recent = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    total_customers = len(await db.orders.distinct("user_id"))

    return {
        "total_revenue":     total_revenue,
        "total_orders":      total_orders,
        "revenue_this_week": revenue_this_week,
        "orders_this_week":  orders_this_week,
        "total_customers":   total_customers,
        "top_products":      top_products,
        "recent_orders":     recent,
    }


# ── Admin — Tracking URL ───────────────────────────────────────────────────────

@router.patch("/admin/orders/{order_id}/tracking")
async def set_tracking(order_id: str, body: dict, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    tracking_url = body.get("tracking_url", "")
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"tracking_url": tracking_url, "status": "dispatched"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order and order.get("user_id"):
        user = await db.users.find_one({"id": order["user_id"]}, {"_id": 0})
        if user and user.get("contact"):
            short_id = order_id[:8].upper()
            plain = f"Your ZiyaNisa order #{short_id} has been dispatched! Track here: {tracking_url}"
            html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#2C1A0E">ZiyaNisa</h2>
  <p style="color:#333">{plain}</p>
  <a href="{tracking_url}" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#C6A84B;color:#fff;border-radius:8px;text-decoration:none">Track Order</a>
</div>"""
            asyncio.create_task(deliver_notification(user["contact"], f"Order #{short_id} Dispatched — ZiyaNisa", plain, html))

    return {"id": order_id, "tracking_url": tracking_url}


# ── Admin — Edit Order ────────────────────────────────────────────────────────

@router.put("/admin/orders/{order_id}")
async def admin_edit_order(order_id: str, body: dict, authorization: Optional[str] = Header(None)):
    """Edit order shipping address, notes, or discount. Does NOT modify items/total to preserve payment integrity."""
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    allowed = {"shipping_address", "notes", "discount", "status", "tracking_url"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No editable fields provided")
    result = await db.orders.update_one({"id": order_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated


