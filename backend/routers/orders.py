from fastapi import APIRouter

router = APIRouter()

from PIL import ExifTags
from PIL import Image
from datetime import datetime
from datetime import timezone
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import Header
from fastapi import UploadFile
from typing import Optional
import base64
import httpx
import io
import json as _json
from core import OLLAMA_HOST, UPLOADS_DIR, VISION_MODEL, db, decode_token, is_admin_claims, token_from_header
from core import _PIL_OK
from models import Lead, LeadCreate, Order, OrderCreate

# ── Lead capture ───────────────────────────────────────────────────────────────

@router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    lead = Lead(**payload.model_dump())
    doc = lead.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leads.insert_one(doc)
    return lead


# ── Orders (UPI confirmation flow) ────────────────────────────────────────────

@router.post("/orders", response_model=Order)
async def create_order(payload: OrderCreate, authorization: Optional[str] = Header(None)):
    data = payload.model_dump()
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            data["user_id"] = claims["sub"]
        except HTTPException:
            pass
    order = Order(**data)
    doc = order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.orders.insert_one(doc)
    return order


@router.patch("/orders/{order_id}/confirm")
async def confirm_order(order_id: str, body: dict):
    upi_ref = body.get("upi_ref", "").strip().upper()
    if not upi_ref:
        raise HTTPException(status_code=400, detail="Transaction ID is required")

    # Guard against reuse — but stay idempotent: if the SAME order already
    # locked this txn (e.g. a confirm that timed out client-side and the user
    # retried), return success instead of a scary "used for another order".
    existing_txn = await db.transactions.find_one({"transaction_id": upi_ref})
    if existing_txn and existing_txn.get("order_id") != order_id:
        raise HTTPException(
            status_code=409,
            detail="This Transaction ID has already been used for another order",
        )

    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "payment_confirmed", "upi_ref": upi_ref}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    # Lock transaction ID — idempotent upsert
    await db.transactions.update_one(
        {"transaction_id": upi_ref},
        {"$set": {
            "transaction_id": upi_ref,
            "order_id": order_id,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"id": order_id, "status": "payment_confirmed", "upi_ref": upi_ref}

@router.get("/orders/mine")
async def my_orders(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    rows = await db.orders.find({"user_id": claims["sub"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return rows


# ── Payment verification helpers ─────────────────────────────────────────────

async def _check_image_metadata(image_bytes: bytes) -> dict:
    """Detect image-editing software via EXIF — Photoshop/GIMP edits leave fingerprints."""
    if not _PIL_OK:
        return {"passed": True, "reason": "Pillow not installed — metadata check skipped"}
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif = None
        if hasattr(img, "_getexif"):
            try:
                exif = img._getexif()
            except Exception:
                pass
        editing_sw = []
        if exif:
            for tag_id, val in exif.items():
                tag_name = ExifTags.TAGS.get(tag_id, "")
                if tag_name in ("Software", "ProcessingSoftware"):
                    sw = str(val).lower()
                    if any(s in sw for s in [
                        "photoshop", "gimp", "lightroom", "affinity",
                        "corel", "paint.net", "pixelmator", "canva",
                    ]):
                        editing_sw.append(str(val))
        return {
            "passed": len(editing_sw) == 0,
            "format": img.format or "unknown",
            "dimensions": f"{img.size[0]}×{img.size[1]}",
            "editing_software": editing_sw,
            "reason": (
                f"Image was edited with: {', '.join(editing_sw)}"
                if editing_sw else "No editing software detected in metadata"
            ),
        }
    except Exception as exc:
        return {"passed": True, "reason": f"Metadata parse error (non-blocking): {exc}"}


async def _analyze_with_vision(image_bytes: bytes, expected_amount: int) -> dict:
    """Send screenshot to local Ollama vision model for payment authenticity check."""
    try:
        b64 = base64.b64encode(image_bytes).decode()
        prompt = (
            f"You are a payment fraud detection assistant. Carefully examine this screenshot.\n"
            f"Expected payment amount: Rs.{expected_amount}\n\n"
            f"Answer the following — reply ONLY with valid JSON, no markdown, no extra text:\n"
            f'{{"is_payment_screenshot": true/false, '
            f'"payment_status_success": true/false, '
            f'"has_transaction_id": true/false, '
            f'"amount_visible": true/false, '
            f'"amount_matches": true/false, '
            f'"looks_authentic": true/false, '
            f'"reason": "one sentence explanation"}}\n\n'
            f"Guidelines:\n"
            f"- is_payment_screenshot: Is this from a UPI app (PhonePe, GPay, Paytm, BHIM, etc.)?\n"
            f"- payment_status_success: Does it show 'Success', 'Paid', 'Completed' etc.?\n"
            f"- has_transaction_id: Is a UTR/Transaction ID visible?\n"
            f"- amount_matches: Does the amount shown match Rs.{expected_amount}?\n"
            f"- looks_authentic: No obvious Photoshop text overlays, color anomalies, or inconsistent fonts?"
        )
        async with httpx.AsyncClient(timeout=50.0) as client:
            resp = await client.post(
                f"{OLLAMA_HOST}/api/generate",
                json={"model": VISION_MODEL, "prompt": prompt, "images": [b64], "stream": False},
            )
        if resp.status_code != 200:
            return {"looks_authentic": True, "skipped": True, "reason": f"Vision model HTTP {resp.status_code}"}
        raw = resp.json().get("response", "{}").strip()
        # Strip markdown code fences if the model added them
        if raw.startswith("```"):
            raw = raw.split("```")[1].lstrip("json").strip()
        result = _json.loads(raw)
        return result
    except _json.JSONDecodeError:
        return {"looks_authentic": True, "skipped": True, "reason": "Vision model returned unparseable response"}
    except httpx.ConnectError:
        return {"looks_authentic": True, "skipped": True, "reason": "Vision model offline — manual review will apply"}
    except Exception as exc:
        return {"looks_authentic": True, "skipped": True, "reason": str(exc)}


# ── Payment verify endpoint ────────────────────────────────────────────────────

@router.post("/payments/verify")
async def verify_payment(
    transaction_id: str    = Form(...),
    amount:         int    = Form(...),
    screenshot:     UploadFile = File(...),
    order_id:       Optional[str] = Form(None),
):
    txn = transaction_id.strip().upper()
    if not txn or len(txn) < 6:
        raise HTTPException(status_code=400, detail="Transaction ID must be at least 6 characters")

    # 1. Uniqueness check — prevent screenshot reuse across orders. The txn
    # being locked by THIS order is fine: the checkout flow confirms first
    # and uploads the screenshot in the background afterwards.
    existing_txn = await db.transactions.find_one({"transaction_id": txn})
    if existing_txn and existing_txn.get("order_id") != order_id:
        raise HTTPException(
            status_code=409,
            detail="This Transaction ID has already been used for another order. "
                   "If you believe this is an error, please contact support.",
        )

    # 2. File validation
    if not (screenshot.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (PNG, JPEG, or WEBP)")
    image_bytes = await screenshot.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Screenshot file is empty")
    if len(image_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Screenshot too large — maximum 15 MB")

    # 3. Persist the screenshot for the team's manual payment review — done
    # before any authenticity checks so it is kept even if those fail.
    ext = {"image/png": ".png", "image/webp": ".webp"}.get(screenshot.content_type, ".jpg")
    shot_name = f"{txn}{ext}"
    payments_dir = UPLOADS_DIR / "payments"
    payments_dir.mkdir(parents=True, exist_ok=True)
    (payments_dir / shot_name).write_bytes(image_bytes)
    if order_id:
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"payment_screenshot": f"/api/uploads/payments/{shot_name}"}},
        )

    # 4. EXIF / metadata edit detection
    meta = await _check_image_metadata(image_bytes)
    if not meta.get("passed", True):
        return {
            "verified": False,
            "reason": meta.get("reason", "Screenshot appears to have been edited"),
            "checks": {"metadata": meta, "ai": None},
        }

    # 5. AI vision analysis
    ai = await _analyze_with_vision(image_bytes, amount)

    if not ai.get("skipped"):
        if not ai.get("is_payment_screenshot", True):
            return {
                "verified": False,
                "reason": f"This does not look like a UPI payment screenshot. {ai.get('reason', '')}".strip(),
                "checks": {"metadata": meta, "ai": ai},
            }
        if not ai.get("payment_status_success", True):
            return {
                "verified": False,
                "reason": f"The payment does not show a Successful status. {ai.get('reason', '')}".strip(),
                "checks": {"metadata": meta, "ai": ai},
            }
        if not ai.get("looks_authentic", True):
            return {
                "verified": False,
                "reason": f"Screenshot appears manipulated. {ai.get('reason', '')}".strip(),
                "checks": {"metadata": meta, "ai": ai},
            }

    # 6. Save pending verification so confirm endpoint can reference it
    await db.payment_verifications.update_one(
        {"transaction_id": txn},
        {"$set": {
            "transaction_id": txn,
            "amount": amount,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "meta": meta,
            "ai": {k: v for k, v in ai.items() if k != "skipped"},
            "status": "verified",
        }},
        upsert=True,
    )

    ai_reason = ai.get("reason", "") if not ai.get("skipped") else ""
    return {
        "verified": True,
        "reason": ai_reason or "Transaction ID is unique and screenshot passed all checks",
        "checks": {"metadata": meta, "ai": ai},
        "transaction_id": txn,
    }


# ── Payment provider info ──────────────────────────────────────────────────────

UPI_CONFIG = {
    "upi_id": "biliion@indianbnk",
    "merchant_name": "MS BILIION SALES AND SERVICES",
    "currency": "INR",
}

@router.get("/payments/upi-config")
async def upi_config():
    return UPI_CONFIG


# ── Invoice PDF ───────────────────────────────────────────────────────────────

def _build_invoice_pdf(order: dict) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER
    import io

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles = getSampleStyleSheet()
    gold   = colors.HexColor("#D8B45C")
    dark   = colors.HexColor("#2B2118")
    taupe  = colors.HexColor("#8A7A6A")

    h1 = ParagraphStyle("h1", parent=styles["Normal"], fontSize=22, textColor=dark,
                         fontName="Helvetica-Bold", spaceAfter=2)
    h2 = ParagraphStyle("h2", parent=styles["Normal"], fontSize=11, textColor=dark,
                         fontName="Helvetica-Bold", spaceAfter=2)
    small = ParagraphStyle("small", parent=styles["Normal"], fontSize=9, textColor=taupe, spaceAfter=1)
    normal = ParagraphStyle("norm", parent=styles["Normal"], fontSize=9, textColor=dark, spaceAfter=1)
    right  = ParagraphStyle("right", parent=styles["Normal"], fontSize=9, textColor=dark, alignment=TA_RIGHT)

    short_id = order.get("id", "")[:8].upper()
    date_str = ""
    if order.get("created_at"):
        try:
            from datetime import datetime as _dt
            d = _dt.fromisoformat(order["created_at"].replace("Z", "+00:00"))
            date_str = d.strftime("%d %b %Y")
        except Exception:
            date_str = order["created_at"][:10]

    items_total = sum(i.get("price", 0) * i.get("qty", 1) for i in order.get("items", []))
    discount    = order.get("discount", 0) or 0
    grand_total = order.get("total", items_total - discount)
    gst_rate    = 0.18
    taxable     = round(grand_total / (1 + gst_rate), 2)
    cgst        = round((grand_total - taxable) / 2, 2)
    sgst        = cgst

    addr = order.get("shipping_address") or {}
    addr_lines = [
        addr.get("full_name", ""),
        addr.get("line1", ""),
        addr.get("line2", ""),
        f"{addr.get('city', '')} — {addr.get('pin', '')}",
        addr.get("state", ""),
        addr.get("phone", ""),
    ]
    addr_str = "\n".join(l for l in addr_lines if l.strip())

    story = []

    # Header
    story.append(Paragraph("ZiyaNisa", h1))
    story.append(Paragraph("BILION SALES AND SERVICES", h2))
    story.append(Paragraph("Hyderabad, Telangana", small))
    story.append(Paragraph("GSTIN: 36AARFB7808C1ZD", small))
    story.append(HRFlowable(width="100%", thickness=1, color=gold, spaceAfter=6))

    # Invoice meta + bill-to in a two-column table
    meta = [
        [Paragraph("<b>TAX INVOICE</b>", ParagraphStyle("", parent=styles["Normal"], fontSize=13,
                   textColor=dark, fontName="Helvetica-Bold")),
         Paragraph(f"<b>Invoice #</b> ZN-{short_id}<br/><b>Date:</b> {date_str}", right)],
    ]
    t = Table(meta, colWidths=["60%", "40%"])
    t.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(t)
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("<b>Bill To:</b>", normal))
    story.append(Paragraph(addr_str.replace("\n", "<br/>") if addr_str else "—", normal))
    story.append(Spacer(1, 4*mm))

    # Items table
    item_data = [["#", "Item", "Qty", "Unit Price", "Amount"]]
    for idx, item in enumerate(order.get("items", []), 1):
        qty   = item.get("qty", 1)
        price = item.get("price", 0)
        item_data.append([
            str(idx),
            item.get("name", ""),
            str(qty),
            f"₹{price:,.2f}",
            f"₹{price * qty:,.2f}",
        ])

    col_w = [8*mm, 85*mm, 15*mm, 28*mm, 28*mm]
    t2 = Table(item_data, colWidths=col_w, repeatRows=1)
    t2.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  gold),
        ("TEXTCOLOR",    (0,0), (-1,0),  colors.white),
        ("FONTNAME",     (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, colors.HexColor("#FFF8EF")]),
        ("GRID",         (0,0), (-1,-1), 0.3, colors.HexColor("#E8D8C0")),
        ("ALIGN",        (2,0), (-1,-1), "RIGHT"),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 3),
        ("BOTTOMPADDING",(0,0), (-1,-1), 3),
    ]))
    story.append(t2)
    story.append(Spacer(1, 3*mm))

    # Totals
    totals_data = []
    if discount > 0:
        totals_data.append(["Subtotal", f"₹{items_total:,.2f}"])
        totals_data.append([f"Discount", f"- ₹{discount:,.2f}"])
    totals_data.append(["Taxable Value (excl. GST 18%)", f"₹{taxable:,.2f}"])
    totals_data.append(["CGST @9%", f"₹{cgst:,.2f}"])
    totals_data.append(["SGST @9%", f"₹{sgst:,.2f}"])
    totals_data.append(["Grand Total", f"₹{grand_total:,.2f}"])

    t3 = Table([[Paragraph(r[0], right), Paragraph(r[1], right)] for r in totals_data],
               colWidths=["70%", "30%"])
    t3.setStyle(TableStyle([
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TOPPADDING",    (0,0), (-1,-1), 2),
        ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("LINEABOVE",     (0,-1),(-1,-1), 0.8, dark),
        ("FONTNAME",      (0,-1),(-1,-1), "Helvetica-Bold"),
    ]))
    story.append(t3)

    story.append(Spacer(1, 5*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=gold))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "This is a computer-generated invoice and does not require a signature. "
        "Thank you for shopping with ZiyaNisa — BILION SALES AND SERVICES.",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=7.5, textColor=taupe, alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()


@router.get("/orders/{order_id}/invoice")
async def download_invoice(order_id: str, authorization: Optional[str] = Header(None)):
    """Download GST invoice PDF for a specific order (customer's own orders only)."""
    from fastapi.responses import Response
    claims = token_from_header(authorization)
    order = await db.orders.find_one({"id": order_id, "user_id": claims["sub"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    pdf = _build_invoice_pdf(order)
    short = order_id[:8].upper()
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="ZiyaNisa-Invoice-{short}.pdf"'})


@router.get("/admin/orders/{order_id}/invoice")
async def admin_download_invoice(order_id: str, authorization: Optional[str] = Header(None)):
    """Download GST invoice PDF for any order (admin only)."""
    from fastapi.responses import Response
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    pdf = _build_invoice_pdf(order)
    short = order_id[:8].upper()
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="ZiyaNisa-Invoice-{short}.pdf"'})


# ── Order detail ─────────────────────────────────────────────────────────────

@router.get("/orders/{order_id}")
async def get_order(order_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    order = await db.orders.find_one({"id": order_id, "user_id": claims["sub"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


