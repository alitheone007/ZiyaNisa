"""
OTP delivery for ZiyaNisa.
  - Phone contacts  → SMS via 2factor.in
  - Email contacts  → SMTP
  - Notifications   → SMTP (email) only

ENV vars required:
  TWOFACTOR_API_KEY   from https://2factor.in (Dashboard → API)
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM
"""

import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

log = logging.getLogger("otp_sender")
BRAND = "ZiyaNisa"

# ── SMTP ──────────────────────────────────────────────────────────────────────
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "") or SMTP_USER

# ── 2factor.in ────────────────────────────────────────────────────────────────
TWOFACTOR_API_KEY = os.environ.get("TWOFACTOR_API_KEY", "")


# ── SMS via 2factor.in ────────────────────────────────────────────────────────

async def send_sms_otp(phone: str, otp: str) -> bool:
    digits = "".join(c for c in phone if c.isdigit())[-10:]
    if not TWOFACTOR_API_KEY:
        log.warning("TWOFACTOR_API_KEY not set — SMS OTP skipped")
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://2factor.in/API/V1/{TWOFACTOR_API_KEY}/SMS/{digits}/{otp}/OTP1"
            )
            data = r.json()
            if data.get("Status") == "Success":
                return True
            log.error("2factor.in error: %s", data)
            return False
    except Exception as exc:
        log.error("2factor.in SMS failed for %s: %s", phone, exc)
        return False


# ── Email via SMTP ────────────────────────────────────────────────────────────

def _smtp_send_sync(to_email: str, subject: str, plain: str, html: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html,  "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as exc:
        log.error("SMTP send failed to %s: %s", to_email, exc)
        return False


async def send_email_otp(to_email: str, otp: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        log.warning("SMTP not configured — email OTP skipped")
        return False
    subject = f"{otp} is your {BRAND} verification code"
    plain   = f"Your {BRAND} OTP is: {otp}\n\nValid for 10 minutes. Do not share this code."
    html    = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#2C1A0E">{BRAND}</h2>
  <p style="color:#888;font-size:13px;margin-top:0">Beauty &amp; Lifestyle</p>
  <hr style="border:none;border-top:1px solid #f0e6d3;margin:16px 0">
  <p style="font-size:15px;color:#333">Your verification code:</p>
  <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#C6A84B;padding:16px 0">{otp}</div>
  <p style="font-size:13px;color:#888">Valid for 10 minutes. Never share this code.</p>
</div>"""
    return await asyncio.to_thread(_smtp_send_sync, to_email, subject, plain, html)


async def send_email_notification(to_email: str, subject: str, plain: str, html: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        return False
    return await asyncio.to_thread(_smtp_send_sync, to_email, subject, plain, html)


# ── Unified delivery ──────────────────────────────────────────────────────────

async def deliver_otp(contact: str, otp: str) -> dict[str, bool]:
    """Route OTP: email contacts → SMTP, phone contacts → 2factor.in SMS."""
    if "@" in contact:
        ok = await send_email_otp(contact, otp)
        return {"email": ok, "sms": False}
    ok = await send_sms_otp(contact, otp)
    return {"email": False, "sms": ok}


async def deliver_notification(contact: str, subject: str, plain: str, html: str) -> None:
    """Fire-and-forget notification for order/booking status updates."""
    if "@" in contact:
        await send_email_notification(contact, subject, plain, html)
    else:
        log.info("Notification to phone %s skipped (SMS notifications not supported)", contact)
