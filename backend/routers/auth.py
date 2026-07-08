from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from datetime import timedelta
from datetime import timezone
from fastapi import HTTPException
from fastapi import Header
from otp_sender import deliver_otp
from typing import Optional
import logging
import random
import uuid
from core import DEV_MODE, OTP_STORE, _otp_rate_check, create_token, db, get_admin_paired_contacts, is_admin_claims, is_admin_contact, is_email, normalize_phone, token_from_header
from models import SendOtpInput, TokenOut, UpdateProfileInput, UserOut, VerifyOtpInput

# ── Auth endpoints (OTP-based, passwordless) ──────────────────────────────────

@router.post("/auth/send-otp")
async def send_otp(payload: SendOtpInput):
    contact = payload.contact.strip()
    if not contact:
        raise HTTPException(status_code=400, detail="Contact (email or phone) is required")

    # Rate-limit: max 5 OTP sends per contact per hour (skip in dev mode)
    if not DEV_MODE:
        _otp_rate_check(contact)

    otp = str(random.randint(100000, 999999))
    OTP_STORE[contact] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=10)}

    if DEV_MODE:
        return {"message": "OTP sent (dev mode)", "dev_otp": otp, "expires_in": 600}

    results = await deliver_otp(contact, otp)
    if not any(results.values()):
        logging.warning("All OTP channels failed for %s: %s", contact, results)
        raise HTTPException(status_code=502, detail="Could not send OTP. Check your contact or try again later.")

    return {"message": "OTP sent", "expires_in": 600}

@router.post("/auth/verify-otp", response_model=TokenOut)
async def verify_otp(payload: VerifyOtpInput):
    contact = payload.contact.strip()
    record = OTP_STORE.get(contact)
    if not record:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")
    if datetime.now(timezone.utc) > record["expires"]:
        OTP_STORE.pop(contact, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")
    if record["otp"] != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Incorrect OTP. Please try again.")
    OTP_STORE.pop(contact, None)

    user_doc = await db.users.find_one({"contact": contact}, {"_id": 0})
    if not user_doc and is_admin_contact(contact):
        # Admin may have signed in before with their paired phone/email — reuse that record
        for paired in get_admin_paired_contacts(contact):
            user_doc = await db.users.find_one({"contact": paired}, {"_id": 0})
            if user_doc:
                break
    if user_doc and user_doc.get("deactivated"):
        raise HTTPException(status_code=403, detail="This account has been deactivated. Contact support to restore access.")
    if not user_doc:
        uid = str(uuid.uuid4())
        user_doc = {
            "id": uid,
            "contact": contact,
            "email": contact if is_email(contact) else None,
            "phone": normalize_phone(contact) if not is_email(contact) else None,
            "name": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)

    token = create_token({"sub": user_doc["id"], "contact": contact, "name": user_doc.get("name")})
    return {"access_token": token, "user": {"id": user_doc["id"], "name": user_doc.get("name"), "contact": contact, "is_admin": is_admin_contact(contact)}}

@router.get("/auth/check-contact")
async def check_contact(contact: str):
    """Return whether a phone/email already has an account, and the name if so."""
    clean = contact.strip()
    user_doc = await db.users.find_one({"contact": clean}, {"_id": 0, "name": 1, "contact": 1})
    if not user_doc:
        digits = "".join(c for c in clean if c.isdigit())
        if len(digits) >= 10:
            last10 = digits[-10:]
            user_doc = await db.users.find_one(
                {"$expr": {"$eq": [{"$substrCP": ["$contact", {"$subtract": [{"$strLenCP": "$contact"}, 10]}, 10]}, last10]}},
                {"_id": 0, "name": 1, "contact": 1},
            )
    return {
        "exists": bool(user_doc),
        "name": user_doc.get("name") if user_doc else None,
    }


@router.get("/auth/me", response_model=UserOut)
async def get_me(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    return {"id": claims["sub"], "name": claims.get("name"), "contact": claims["contact"], "is_admin": is_admin_claims(claims)}

@router.patch("/auth/profile", response_model=UserOut)
async def update_profile(payload: UpdateProfileInput, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    update = {}
    if payload.name is not None:
        update["name"] = payload.name
    if payload.phone is not None:
        update["phone"] = payload.phone
    if update:
        await db.users.update_one({"id": uid}, {"$set": update})
    user_doc = await db.users.find_one({"id": uid}, {"_id": 0})
    return {"id": uid, "name": user_doc.get("name"), "contact": user_doc["contact"], "is_admin": is_admin_claims(claims)}


@router.delete("/auth/account")
async def deactivate_account(authorization: Optional[str] = Header(None)):
    """Soft-delete the calling user's account — marks deactivated, preserves order history."""
    claims = token_from_header(authorization)
    uid = claims["sub"]
    if is_admin_claims(claims):
        raise HTTPException(status_code=400, detail="Admin accounts cannot be deactivated this way.")
    result = await db.users.update_one(
        {"id": uid},
        {"$set": {"deactivated": True, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Account deactivated. Your order history has been retained."}


