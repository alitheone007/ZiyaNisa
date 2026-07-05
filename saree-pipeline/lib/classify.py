"""Stage 3 - AI RECOGNITION (the only paid stage). Cost controls:
  1. Runs ONLY on images that passed local QA + dedupe (usually a minority).
  2. Each image downscaled to 512px before sending  (~5-10x fewer tokens).
  3. Up to 8 images per API call (one shared prompt, batched).
  4. claude-haiku model - cheapest, plenty for saree vs dress-material.
  5. Result cached in SQLite (ai_checked=1) - an image is NEVER classified twice.
  6. Confidence field: 'low' confidence => routed to your manual chat prompt
     instead of guessing (your 'ask me like a chat box' requirement).

Rough cost: a 512px image ~ 350-400 tokens. 8 images + prompt ~ 3.5k input
tokens per call => hundreds of images classified for a few cents on Haiku.
Set ANTHROPIC_API_KEY env var before running.
"""
import base64, io, json, os
from PIL import Image

MODEL = "claude-haiku-4-5-20251001"
BATCH = 8
THUMB = 512

PROMPT = """You are classifying Indian garment product photos for an Amazon listing pipeline.
For EACH numbered image, return a JSON array (same order) of objects:
{"n": <number>, "item_type": "saree"|"dress_material"|"lehenga"|"kurti"|"blouse"|"dupatta"|"other",
 "confidence": "high"|"low",
 "color": "<dominant color>", "fabric_guess": "<silk/cotton/georgette/chiffon/banarasi/etc or unknown>",
 "listing_quality": "good"|"poor",  // good = clean product shot usable on Amazon; poor = cluttered/collage/watermarked/screenshot
 "issues": "<short note if poor, else empty>"}
If unsure of item_type, use confidence "low" - do NOT guess. Reply ONLY with the JSON array."""

def _thumb_b64(path):
    img = Image.open(path).convert("RGB")
    img.thumbnail((THUMB, THUMB), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return base64.b64encode(buf.getvalue()).decode()

def classify_batch(paths):
    """Returns list of dicts aligned to paths. Requires anthropic SDK + API key."""
    import anthropic
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY
    out = []
    for i in range(0, len(paths), BATCH):
        chunk = paths[i:i + BATCH]
        content = []
        for n, p in enumerate(chunk, 1):
            content.append({"type": "text", "text": f"Image {n}:"})
            content.append({"type": "image", "source": {
                "type": "base64", "media_type": "image/jpeg", "data": _thumb_b64(p)}})
        content.append({"type": "text", "text": PROMPT})
        resp = client.messages.create(model=MODEL, max_tokens=1500,
                                      messages=[{"role": "user", "content": content}])
        txt = resp.content[0].text.strip().removeprefix("```json").removeprefix("```").removesuffix("```")
        try:
            out.extend(json.loads(txt))
        except json.JSONDecodeError:
            out.extend([{"n": n, "item_type": "?", "confidence": "low",
                         "issues": "parse_error"} for n in range(1, len(chunk) + 1)])
    return out
