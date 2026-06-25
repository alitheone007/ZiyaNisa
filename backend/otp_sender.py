"""
Multi-channel OTP delivery — Email (SMTP) + SMS (Indian gateway) + WhatsApp (n8n, optional).

ENV vars (same for all containers — set once in .env):
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
  SMS_PROVIDER  = fast2sms | 2factor | msg91
  SMS_API_KEY
  SMS_SENDER_ID (optional, default ZIYANA)
  N8N_OTP_WEBHOOK (optional WhatsApp fallback via n8n)
"""

import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx

log = logging.getLogger("otp_sender")

# ── SMTP ─────────────────────────────────────────────────────────────────────
SMTP_HOST  = os.environ.get("SMTP_HOST", "")
SMTP_PORT  = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER  = os.environ.get("SMTP_USER", "")
SMTP_PASS  = os.environ.get("SMTP_PASS", "")
SMTP_FROM  = os.environ.get("SMTP_FROM", "") or SMTP_USER

# ── SMS ───────────────────────────────────────────────────────────────────────
SMS_PROVIDER          = os.environ.get("SMS_PROVIDER", "fast2sms")
SMS_API_KEY           = os.environ.get("SMS_API_KEY", "")
SMS_SENDER_ID         = os.environ.get("SMS_SENDER_ID", "ZIYANA")
FAST2SMS_OTP_TEMPLATE = os.environ.get("FAST2SMS_OTP_TEMPLATE", "")  # OTP template ID from Fast2SMS dashboard

# ── WhatsApp (optional, via n8n) ──────────────────────────────────────────────
N8N_OTP_WEBHOOK = os.environ.get("N8N_OTP_WEBHOOK", "")

BRAND = "ZiyaNisa"


# ── Email via SMTP ─────────────────────────────────────────────────────────────

def _smtp_send_sync(to_email: str, otp: str) -> bool:
    """Synchronous SMTP send — run inside asyncio.to_thread."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} is your {BRAND} verification code"
        msg["From"]    = SMTP_FROM
        msg["To"]      = to_email

        plain = (
            f"Your {BRAND} OTP is: {otp}\n\n"
            "Valid for 10 minutes. Do not share this code with anyone."
        )
        html = f"""<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
  <h2 style="color:#2C1A0E;margin-bottom:4px">{BRAND}</h2>
  <p style="color:#888;font-size:13px;margin-top:0">Beauty &amp; Lifestyle</p>
  <hr style="border:none;border-top:1px solid #f0e6d3;margin:16px 0">
  <p style="font-size:15px;color:#333">Your verification code:</p>
  <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#C6A84B;padding:16px 0">{otp}</div>
  <p style="font-size:13px;color:#888">Valid for 10 minutes. Never share this code.</p>
</div>"""

        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as exc:
        log.error("Email OTP failed to %s: %s", to_email, exc)
        return False


async def send_email_otp(to_email: str, otp: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        log.warning("SMTP not configured — skipping email OTP")
        return False
    return await asyncio.to_thread(_smtp_send_sync, to_email, otp)


# ── SMS via Indian gateway ─────────────────────────────────────────────────────

async def send_sms_otp(phone: str, otp: str) -> bool:
    digits = "".join(c for c in phone if c.isdigit())[-10:]
    if not SMS_API_KEY:
        log.warning("SMS_API_KEY not set — skipping SMS OTP")
        return False

    try:
        async with httpx.AsyncClient(timeout=10) as client:

            if SMS_PROVIDER == "fast2sms":
                # fast2sms.com — new OTP endpoint (POST /dev/otp/send)
                # Requires otp_id = OTP template ID from Fast2SMS dashboard
                if not FAST2SMS_OTP_TEMPLATE:
                    log.warning("FAST2SMS_OTP_TEMPLATE not set — skipping SMS OTP")
                    return False
                payload: dict = {
                    "mobile": digits,
                    "otp_id": FAST2SMS_OTP_TEMPLATE,
                    "otp": otp,
                    "otp_expiry": 10,
                }
                r = await client.post(
                    "https://www.fast2sms.com/dev/otp/send",
                    headers={
                        "authorization": SMS_API_KEY,
                        "accept": "application/json",
                        "content-type": "application/json",
                    },
                    json=payload,
                )
                data = r.json()
                ok = r.status_code == 200 and data.get("return", False)
                if not ok:
                    log.error("fast2sms OTP error: %s", data)
                return ok

            elif SMS_PROVIDER == "2factor":
                # 2factor.in — simple GET API, transactional OTP
                r = await client.get(
                    f"https://2factor.in/API/V1/{SMS_API_KEY}/SMS/{digits}/{otp}/OTP1"
                )
                data = r.json()
                ok = data.get("Status") == "Success"
                if not ok:
                    log.error("2factor error: %s", data)
                return ok

            elif SMS_PROVIDER == "msg91":
                # msg91.com — enterprise Indian SMS, needs DLT template
                template_id = os.environ.get("MSG91_TEMPLATE_ID", "")
                r = await client.post(
                    "https://control.msg91.com/api/v5/otp",
                    headers={"authkey": SMS_API_KEY, "content-type": "application/json"},
                    json={
                        "template_id": template_id,
                        "mobile": f"91{digits}",
                        "otp": otp,
                        "otp_expiry": 10,
                    },
                )
                data = r.json()
                ok = data.get("type") == "success"
                if not ok:
                    log.error("msg91 error: %s", data)
                return ok

            else:
                log.error("Unknown SMS_PROVIDER: %s", SMS_PROVIDER)
                return False

    except Exception as exc:
        log.error("SMS OTP failed (%s) to %s: %s", SMS_PROVIDER, phone, exc)
        return False


# ── WhatsApp via n8n (optional) ───────────────────────────────────────────────

async def send_whatsapp_otp(phone: str, otp: str) -> bool:
    if not N8N_OTP_WEBHOOK:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                N8N_OTP_WEBHOOK,
                json={"phone": phone, "otp": otp, "brand": BRAND},
            )
            return r.status_code < 300
    except Exception as exc:
        log.error("WhatsApp OTP via n8n failed: %s", exc)
        return False


# ── General notification (non-OTP) ───────────────────────────────────────────

def _smtp_notify_sync(to_email: str, subject: str, plain: str, html: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_FROM, [to_email], msg.as_string())
        return True
    except Exception as exc:
        log.error("Email notification failed to %s: %s", to_email, exc)
        return False


async def send_email_notification(to_email: str, subject: str, plain: str, html: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        return False
    return await asyncio.to_thread(_smtp_notify_sync, to_email, subject, plain, html)


async def send_whatsapp_notification(phone: str, message: str) -> bool:
    if not N8N_OTP_WEBHOOK:
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(N8N_OTP_WEBHOOK, json={"phone": phone, "message": message, "brand": BRAND})
            return r.status_code < 300
    except Exception as exc:
        log.error("WhatsApp notification failed: %s", exc)
        return False


async def deliver_notification(contact: str, subject: str, plain: str, html: str) -> None:
    """Fire-and-forget notification (order/booking status updates). Non-blocking."""
    if "@" in contact:
        await send_email_notification(contact, subject, plain, html)
    else:
        await send_whatsapp_notification(contact, plain)


# ── Unified entry point ────────────────────────────────────────────────────────

async def deliver_otp(contact: str, otp: str) -> dict[str, bool]:
    """
    Route OTP to the right channel(s) based on contact type.
    - email contact → SMTP email
    - phone contact → SMS first, WhatsApp as fallback (or parallel if both configured)
    Returns {"email": bool, "sms": bool, "whatsapp": bool}
    """
    results: dict[str, bool] = {"email": False, "sms": False, "whatsapp": False}

    if "@" in contact:
        results["email"] = await send_email_otp(contact, otp)
    else:
        # Try SMS first
        results["sms"] = await send_sms_otp(contact, otp)

        if results["sms"]:
            # SMS worked — also fire WhatsApp in background (non-blocking)
            if N8N_OTP_WEBHOOK:
                asyncio.create_task(send_whatsapp_otp(contact, otp))
        else:
            # SMS failed — fall back to WhatsApp
            results["whatsapp"] = await send_whatsapp_otp(contact, otp)

    return results
