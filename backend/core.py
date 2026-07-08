"""Shared config, DB client, and auth helpers — imported by all routers."""
"""
ZiyaNisa — FastAPI backend.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Query, Header, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt, JWTError
import os
import random
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import asyncio
import uuid
import math
import io
import base64
import json as _json
import httpx
from datetime import datetime, timezone, timedelta
from otp_sender import deliver_otp, deliver_notification, send_email_notification

try:
    from PIL import Image, ExifTags
    _PIL_OK = True
except ImportError:
    _PIL_OK = False


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


UPLOADS_DIR = Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── Auth config ───────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "ziya-nisa-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
DEV_MODE = os.environ.get("ENVIRONMENT", "development") == "development"
# Comma-separated; order matters: ADMIN_PHONE[i] and ADMIN_EMAIL[i] are the same person
ADMIN_PHONES       = [p.strip() for p in os.environ.get("ADMIN_PHONE", "").split(",") if p.strip()]
_ADMIN_EMAILS_LIST = [e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()]
ADMIN_EMAILS       = set(_ADMIN_EMAILS_LIST)
# First admin email — notification target for critical bug reports
ADMIN_EMAIL        = _ADMIN_EMAILS_LIST[0] if _ADMIN_EMAILS_LIST else ""
# Pairs: [(phone_or_None, email_or_None), ...] — same index means same person
from itertools import zip_longest as _zip_longest
_ADMIN_PAIRS: List[tuple] = list(_zip_longest(ADMIN_PHONES, _ADMIN_EMAILS_LIST, fillvalue=None))
OLLAMA_HOST   = os.environ.get("OLLAMA_HOST",  "http://localhost:11434")
VISION_MODEL  = os.environ.get("VISION_MODEL", "moondream")
GITHUB_TOKEN  = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO   = os.environ.get("GITHUB_REPO", "")   # e.g. "alitheone007/ziyanisa"

# In-memory OTP store: { contact → { otp, expires } }
OTP_STORE: dict = {}

# OTP rate-limit store: { contact → [send_timestamps] }
# Limits to 5 OTP sends per contact per hour to prevent SMS quota exhaustion.
OTP_RATE: dict = {}
OTP_RATE_MAX   = 5    # max sends per window
OTP_RATE_SECS  = 3600 # 1-hour rolling window

def _otp_rate_check(contact: str) -> None:
    """Raise 429 if this contact has hit the OTP rate limit."""
    now  = datetime.now(timezone.utc)
    hits = OTP_RATE.get(contact, [])
    hits = [t for t in hits if (now - t).total_seconds() < OTP_RATE_SECS]
    if len(hits) >= OTP_RATE_MAX:
        wait = OTP_RATE_SECS - int((now - hits[0]).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Too many OTP requests. Please wait {wait // 60 + 1} minute(s) before trying again.",
        )
    hits.append(now)
    OTP_RATE[contact] = hits

def create_token(payload: dict) -> str:
    data = {**payload, "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)}
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def token_from_header(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(authorization.split(" ", 1)[1])

def is_email(s: str) -> bool:
    return "@" in s

def normalize_phone(s: str) -> str:
    return "".join(c for c in s if c.isdigit())

def is_admin_contact(contact: str) -> bool:
    c = contact.strip()
    if c.lower() in ADMIN_EMAILS:
        return True
    norm = normalize_phone(c)[-10:] if c else ""
    return bool(norm) and any(normalize_phone(p)[-10:] == norm for p in ADMIN_PHONES)

def is_admin_claims(claims: dict) -> bool:
    return is_admin_contact(claims.get("contact", ""))

def get_admin_paired_contacts(contact: str) -> List[str]:
    """Return the other contact(s) that belong to the same admin person."""
    c = contact.strip()
    norm = normalize_phone(c)[-10:] if not is_email(c) else None
    for phone, email in _ADMIN_PAIRS:
        phone_match = phone and norm and normalize_phone(phone)[-10:] == norm
        email_match = email and is_email(c) and email.lower() == c.lower()
        if phone_match or email_match:
            return [x for x in [phone, email] if x and x != c]
    return []

