from fastapi import APIRouter

router = APIRouter()

import asyncio
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, Header, Query
from typing import Optional

from core import ADMIN_EMAIL, db, is_admin_claims, token_from_header
from models import SellerEnquiryCreate, SellerEnquiryUpdate
from otp_sender import send_email_notification

# ── "Sell on ZiyaNisa" enquiries ───────────────────────────────────────────────

@router.post("/sellers/apply", status_code=201)
async def submit_seller_enquiry(payload: SellerEnquiryCreate):
    doc = {
        "id": str(uuid.uuid4()),
        **payload.model_dump(),
        "phone": "".join(c for c in payload.phone if c.isdigit())[-10:],
        "status": "new",
        "admin_notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.seller_enquiries.insert_one(doc)

    if ADMIN_EMAIL:
        subject = f"[ZiyaNisa] New seller enquiry: {payload.business_name}"
        plain = (
            f"New 'Sell on ZiyaNisa' enquiry.\n\n"
            f"Business: {payload.business_name}\n"
            f"Contact: {payload.contact_name}\n"
            f"Phone: {doc['phone']}\n"
            f"Email: {payload.email or 'N/A'}\n"
            f"Category: {payload.category}\n"
            f"City: {payload.city or 'N/A'}\n\n"
            f"{payload.message or ''}"
        )
        html = (
            f"<p><strong>New seller enquiry on ZiyaNisa.</strong></p>"
            f"<p><strong>Business:</strong> {payload.business_name}</p>"
            f"<p><strong>Contact:</strong> {payload.contact_name}</p>"
            f"<p><strong>Phone:</strong> {doc['phone']}</p>"
            f"<p><strong>Email:</strong> {payload.email or 'N/A'}</p>"
            f"<p><strong>Category:</strong> {payload.category}</p>"
            f"<p><strong>City:</strong> {payload.city or 'N/A'}</p>"
            f"<p><strong>Message:</strong><br>{payload.message or ''}</p>"
        )
        asyncio.create_task(send_email_notification(ADMIN_EMAIL, subject, plain, html))

    return {"ok": True, "id": doc["id"]}


@router.get("/admin/sellers")
async def admin_list_seller_enquiries(
    status: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    filt = {}
    if status:
        filt["status"] = status
    docs = await db.seller_enquiries.find(filt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.patch("/admin/sellers/{enquiry_id}")
async def admin_update_seller_enquiry(
    enquiry_id: str,
    payload: SellerEnquiryUpdate,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = await db.seller_enquiries.update_one({"id": enquiry_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Enquiry not found")
    doc = await db.seller_enquiries.find_one({"id": enquiry_id}, {"_id": 0})
    return doc
