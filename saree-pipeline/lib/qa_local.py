"""Stage 1 - LOCAL QA (zero API cost). Filters images against Amazon.in
image standards BEFORE any AI call. Only survivors + borderline cases
ever reach the vision API.

Amazon apparel/saree image rules enforced here:
  - Longest side >= 1000px (zoom requirement; hard reject < 500px)
  - JPEG/PNG (JPEG preferred for upload)
  - No extreme aspect ratios (screenshots, WhatsApp status crops)
  - MAIN image candidate check: near-pure-white background (RGB ~255)
  - Not blurry (Laplacian variance heuristic)
  - File size sane (<10MB)
"""
from PIL import Image, ImageFilter, ImageStat
import os

MIN_LONG_SIDE_HARD = 500     # below this: reject, ask supplier to resend
MIN_LONG_SIDE_ZOOM = 1000    # below this: usable but flag (no zoom on Amazon)
MAX_ASPECT = 2.2
BLUR_THRESHOLD = 45.0        # tune with your own images

def _blur_score(img):
    g = img.convert("L").resize((min(img.width, 800),) * 2 and
                                (min(img.width, 800), min(img.height, 800)))
    edges = g.filter(ImageFilter.FIND_EDGES)
    return ImageStat.Stat(edges).var[0]

def _white_bg_ratio(img):
    """Fraction of border pixels that are near-white (main-image test)."""
    im = img.convert("RGB").resize((200, 200))
    px = im.load()
    border, white = 0, 0
    for i in range(200):
        for j in (0, 1, 198, 199):
            for p in (px[i, j], px[j, i]):
                border += 1
                if min(p) > 235:
                    white += 1
    return white / border

def qa_check(path):
    """Returns dict: status(pass/fail/manual_review), reasons[], main_ok(bool), meta."""
    reasons, status = [], "pass"
    try:
        img = Image.open(path)
        img.load()
    except Exception as e:
        return {"status": "fail", "reasons": [f"unreadable: {e}"], "main_ok": False}

    w, h = img.size
    long_side = max(w, h)
    if long_side < MIN_LONG_SIDE_HARD:
        status = "fail"; reasons.append(f"too small {w}x{h} (<{MIN_LONG_SIDE_HARD}px) - regenerate/re-request")
    elif long_side < MIN_LONG_SIDE_ZOOM:
        reasons.append(f"below 1000px ({w}x{h}) - no zoom, usable as OTHER image only")
        status = "manual_review"

    ar = max(w, h) / max(1, min(w, h))
    if ar > MAX_ASPECT:
        status = "fail"; reasons.append(f"bad aspect ratio {ar:.1f} (likely screenshot/status crop)")

    if os.path.getsize(path) > 10 * 1024 * 1024:
        status = "manual_review"; reasons.append("file >10MB - recompress")

    if img.format not in ("JPEG", "PNG", "WEBP"):
        status = "manual_review"; reasons.append(f"format {img.format} - convert to JPEG")

    blur = _blur_score(img)
    if blur < BLUR_THRESHOLD and status != "fail":
        status = "manual_review"; reasons.append(f"possibly blurry (score {blur:.0f})")

    wbg = _white_bg_ratio(img)
    main_ok = wbg > 0.85 and status == "pass"
    if not main_ok and status == "pass":
        reasons.append(f"background not pure white ({wbg:.0%}) - OK for OTHER slots, not MAIN")

    return {"status": status, "reasons": reasons, "main_ok": main_ok,
            "size": f"{w}x{h}", "white_bg": round(wbg, 2), "blur": round(blur, 1)}

def normalize(path, out_path, max_side=3000):
    """Convert to sRGB JPEG q90, cap size - Amazon-upload-ready copy."""
    img = Image.open(path).convert("RGB")
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.LANCZOS)
    img.save(out_path, "JPEG", quality=90, optimize=True)
    return out_path
