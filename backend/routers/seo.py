from fastapi import APIRouter

router = APIRouter()

from fastapi import HTTPException
import os
from core import db
from seeds import CATEGORIES_SEED, PRODUCTS_SEED, SERVICES_SEED

# ── SEO: sitemap ───────────────────────────────────────────────────────────────
# Referenced from /robots.txt (cross-path sitemaps are valid when declared
# there). Built live from DB + seed products/services so it never goes stale.

SITE_URL = os.environ.get("SITE_URL", "https://ziyanisa.bilionsales.com")

@router.get("/sitemap.xml")
async def sitemap():
    from fastapi.responses import Response as _Resp
    static_paths = ["/", "/shop", "/services", "/skin-quiz", "/beautician/apply"]
    urls = [(p, "weekly", "0.8" if p != "/" else "1.0") for p in static_paths]

    db_products = await db.products.find({}, {"_id": 0, "id": 1}).to_list(2000)
    ids = {p["id"] for p in db_products} | {p["id"] for p in PRODUCTS_SEED}
    urls += [(f"/product/{pid}", "weekly", "0.7") for pid in sorted(ids)]

    cats = await db.categories.find({}, {"_id": 0, "id": 1}).to_list(100)
    cat_ids = {c["id"] for c in cats} | {c["id"] for c in CATEGORIES_SEED}
    urls += [(f"/shop/{cid}", "weekly", "0.6") for cid in sorted(cat_ids)]

    svcs = await db.services.find({}, {"_id": 0, "id": 1}).to_list(200)
    svc_ids = {s["id"] for s in svcs} | {s["id"] for s in SERVICES_SEED}
    urls += [(f"/book/{sid}", "monthly", "0.6") for sid in sorted(svc_ids)]

    body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    body += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for path, freq, pri in urls:
        body += (f"  <url><loc>{SITE_URL}{path}</loc>"
                 f"<changefreq>{freq}</changefreq><priority>{pri}</priority></url>\n")
    body += "</urlset>\n"
    return _Resp(content=body, media_type="application/xml")


@router.get("/og/product/{product_id}")
async def og_product(product_id: str):
    """Server-rendered OG meta for social link-preview bots (WhatsApp, FB,
    Twitter...) which don't run JS. Nginx routes only bot user-agents here;
    humans always get the SPA. Includes a redirect for any human who lands
    on the raw URL."""
    import html as _html
    from fastapi.responses import HTMLResponse
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    name  = _html.escape(product.get("name", "Product"))
    brand = _html.escape(product.get("brand", "ZiyaNisa"))
    price = product.get("price", 0)
    img   = product.get("img", "") or f"{SITE_URL}/og-cover.png"
    if img.startswith("/"):
        img = f"{SITE_URL}{img}"
    img   = _html.escape(img)
    url   = f"{SITE_URL}/product/{_html.escape(product_id)}"
    title = f"{name} — ZiyaNisa"
    desc  = _html.escape(f"{name} by {brand} — ₹{price:,} at ZiyaNisa. Premium beauty & lifestyle.")

    page = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:site_name" content="ZiyaNisa">
<meta property="og:type" content="product">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:image" content="{img}">
<meta property="product:price:amount" content="{price}">
<meta property="product:price:currency" content="INR">
<meta http-equiv="refresh" content="0;url={url}">
</head><body><p>Redirecting to <a href="{url}">{title}</a>…</p></body></html>"""
    return HTMLResponse(content=page)


