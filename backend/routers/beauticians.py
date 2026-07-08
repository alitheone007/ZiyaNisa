from fastapi import APIRouter

router = APIRouter()

from datetime import datetime
from datetime import timezone
from fastapi import HTTPException
from fastapi import Header
from fastapi import Query
from pydantic import BaseModel
from pydantic import Field
from typing import List
from typing import Optional
import math
import uuid
from core import db, is_admin_claims, token_from_header

# ── H3 Beautician Allocation Engine ──────────────────────────────────────────

try:
    import h3 as _h3
    _H3_OK = True
except ImportError:
    _H3_OK = False

H3_RES = 9  # ring-1 ≈ 530 m, ring-2 ≈ 1 km, ring-3 ≈ 1.6 km, ring-4 ≈ 2.1 km

HYD_AREA_COORDS: dict = {
    "Banjara Hills":  (17.4126, 78.4357),
    "Jubilee Hills":  (17.4239, 78.4072),
    "Madhapur":       (17.4481, 78.3915),
    "Hitech City":    (17.4435, 78.3772),
    "Gachibowli":     (17.4401, 78.3489),
    "Kondapur":       (17.4600, 78.3600),
    "Panjagutta":     (17.4270, 78.4441),
    "Ameerpet":       (17.4375, 78.4483),
    "Masab Tank":     (17.3961, 78.4677),
    "Film Nagar":     (17.4082, 78.3979),
    "Somajiguda":     (17.4281, 78.4618),
    "Begumpet":       (17.4412, 78.4709),
    "Kukatpally":     (17.4842, 78.4002),
    "KPHB Colony":    (17.4884, 78.3912),
    "Secunderabad":   (17.4399, 78.4983),
    "Dilsukhnagar":   (17.3686, 78.5263),
    "LB Nagar":       (17.3497, 78.5513),
    "Manikonda":      (17.4003, 78.3897),
    "Kompally":       (17.5456, 78.4691),
    "Nizampet":       (17.5053, 78.3873),
    "Miyapur":        (17.4963, 78.3544),
    "Tolichowki":     (17.3917, 78.4218),
    "Mehdipatnam":    (17.3965, 78.4417),
    "Attapur":        (17.3820, 78.4277),
    "Nanakramguda":   (17.4177, 78.3560),
}

BEAUTICIANS_SEED: List[dict] = [
    {"id": "b-hyd-01", "name": "Priya Sharma",  "photo": "https://images.unsplash.com/photo-1494790108755-2616b332c41f?w=300&q=80", "phone": "9876543201", "lat": 17.4126, "lng": 78.4357, "area": "Banjara Hills",  "skills": ["s1","s2","s6","s4"], "rating": 4.9, "reviews_count": 142, "active": True, "on_duty": True},
    {"id": "b-hyd-02", "name": "Ayesha Khan",   "photo": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80", "phone": "9876543202", "lat": 17.4239, "lng": 78.4072, "area": "Jubilee Hills",  "skills": ["s3","s8","s1"],     "rating": 4.8, "reviews_count":  98, "active": True, "on_duty": True},
    {"id": "b-hyd-03", "name": "Sneha Reddy",   "photo": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&q=80", "phone": "9876543203", "lat": 17.4481, "lng": 78.3915, "area": "Madhapur",       "skills": ["s2","s5","s7","s4"], "rating": 4.7, "reviews_count": 203, "active": True, "on_duty": True},
    {"id": "b-hyd-04", "name": "Kavya Nair",    "photo": "https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=300&q=80", "phone": "9876543204", "lat": 17.4435, "lng": 78.3772, "area": "Hitech City",    "skills": ["s1","s6","s2"],     "rating": 4.6, "reviews_count":  67, "active": True, "on_duty": True},
    {"id": "b-hyd-05", "name": "Divya Menon",   "photo": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=300&q=80", "phone": "9876543205", "lat": 17.4270, "lng": 78.4441, "area": "Panjagutta",     "skills": ["s3","s8","s1","s2"],"rating": 4.9, "reviews_count": 311, "active": True, "on_duty": True},
    {"id": "b-hyd-06", "name": "Fatima Begum",  "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80", "phone": "9876543206", "lat": 17.4375, "lng": 78.4483, "area": "Ameerpet",       "skills": ["s4","s5","s6","s7"], "rating": 4.7, "reviews_count": 156, "active": True, "on_duty": True},
    {"id": "b-hyd-07", "name": "Rekha Singh",   "photo": "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=300&q=80", "phone": "9876543207", "lat": 17.4082, "lng": 78.3979, "area": "Film Nagar",     "skills": ["s1","s2","s3","s8"], "rating": 4.8, "reviews_count":  89, "active": True, "on_duty": True},
    {"id": "b-hyd-08", "name": "Sania Mirza",   "photo": "https://images.unsplash.com/photo-1569124589354-615739ae007b?w=300&q=80", "phone": "9876543208", "lat": 17.4401, "lng": 78.3489, "area": "Gachibowli",    "skills": ["s5","s6","s7","s4"], "rating": 4.5, "reviews_count":  44, "active": True, "on_duty": True},
    {"id": "b-hyd-09", "name": "Sunita Rao",    "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80", "phone": "9876543209", "lat": 17.4600, "lng": 78.3600, "area": "Kondapur",       "skills": ["s1","s2","s5"],     "rating": 4.7, "reviews_count":  72, "active": True, "on_duty": True},
    {"id": "b-hyd-10", "name": "Ananya Patel",  "photo": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=300&q=80", "phone": "9876543210", "lat": 17.3961, "lng": 78.4677, "area": "Masab Tank",     "skills": ["s3","s8","s6"],     "rating": 4.6, "reviews_count": 115, "active": True, "on_duty": True},
    {"id": "b-hyd-11", "name": "Lakshmi Devi",  "photo": "https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=300&q=80", "phone": "9876543211", "lat": 17.4281, "lng": 78.4618, "area": "Somajiguda",    "skills": ["s1","s4","s6","s7"], "rating": 4.8, "reviews_count":  63, "active": True, "on_duty": True},
    {"id": "b-hyd-12", "name": "Meera Joshi",   "photo": "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=300&q=80", "phone": "9876543212", "lat": 17.4842, "lng": 78.4002, "area": "Kukatpally",    "skills": ["s2","s5","s7"],     "rating": 4.5, "reviews_count":  38, "active": True, "on_duty": True},
]


class BeauticianCreate(BaseModel):
    name: str
    photo: Optional[str] = None
    phone: str
    lat: float
    lng: float
    area: str
    skills: List[str]
    rating: float = 5.0
    active: bool = True
    on_duty: bool = True

class BeauticianSearchInput(BaseModel):
    service_id: str
    lat: float
    lng: float
    date: str
    time_slot: str

class BookingStatusUpdate(BaseModel):
    status: str

class DutyUpdate(BaseModel):
    phone: str
    on_duty: bool
    lat: Optional[float] = None
    lng: Optional[float] = None


class BookingAddressUpdate(BaseModel):
    address: dict
    notes: Optional[str] = None

class AdminDutyUpdate(BaseModel):
    on_duty: bool


class BeauticianApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None
    area: str
    lat: float = 0.0
    lng: float = 0.0
    experience_years: int = 0
    skills: List[str] = []
    selfie_b64: str
    id_proof_b64: str
    id_type: str = "aadhaar"
    status: str = "pending_review"
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FeatureRequestCreate(BaseModel):
    title: str
    category: str                    # booking|auth|beautician|ui|payment|other
    priority: str                    # nice_to_have|useful|important|critical
    use_case: str                    # why is this needed / what problem it solves
    details: Optional[str] = None    # additional context
    page_url: Optional[str] = None
    admin_tab: Optional[str] = None
    screenshots: List[str] = []     # mockups or example screenshots

class FeatureRequestUpdate(BaseModel):
    status: Optional[str] = None    # new|under_consideration|planned|in_progress|shipped|declined
    dev_notes: Optional[str] = None

class BugReportCreate(BaseModel):
    title: str
    category: str                    # booking|auth|beautician|ui|payment|other
    severity: str                    # critical|high|medium|low
    description: str
    steps: Optional[str] = None
    page_url: Optional[str] = None
    admin_tab: Optional[str] = None
    browser_info: Optional[str] = None
    screenshots: List[str] = []     # base64 JPEG, compressed client-side

class BugReportUpdate(BaseModel):
    status: Optional[str] = None    # open|acknowledged|in_progress|resolved|wont_fix
    dev_notes: Optional[str] = None
    fix_commit: Optional[str] = None

class ApplicationReview(BaseModel):
    action: str  # "approve" | "reject"
    rejection_reason: Optional[str] = None


def _h3_cell(lat: float, lng: float) -> Optional[str]:
    if not _H3_OK:
        return None
    return _h3.geo_to_h3(lat, lng, H3_RES)


def _nearest_area(lat: float, lng: float) -> Optional[str]:
    best, best_dist = None, float("inf")
    for name, (alat, alng) in HYD_AREA_COORDS.items():
        d = (alat - lat) ** 2 + (alng - lng) ** 2
        if d < best_dist:
            best_dist = d
            best = name
    return best


@router.get("/services/areas")
async def list_service_areas():
    return [{"name": k, "lat": v[0], "lng": v[1]} for k, v in HYD_AREA_COORDS.items()]


@router.post("/services/search")
async def search_beauticians(payload: BeauticianSearchInput):
    lat, lng = payload.lat, payload.lng

    if _H3_OK:
        customer_cell = _h3.geo_to_h3(lat, lng, H3_RES)
        for ring in range(0, 5):
            cells = list(_h3.k_ring(customer_cell, ring))
            beauticians = await db.beauticians.find(
                {"h3_index": {"$in": cells}, "active": True, "on_duty": {"$ne": False}}, {"_id": 0}
            ).to_list(100)

            available = []
            for b in beauticians:
                if payload.service_id not in b.get("skills", []):
                    continue
                conflict = await db.bookings.find_one({
                    "beautician_id": b["id"],
                    "date": payload.date,
                    "time_slot": payload.time_slot,
                    "status": {"$nin": ["cancelled"]},
                })
                if not conflict:
                    dist = math.sqrt((lat - b["lat"])**2 + (lng - b["lng"])**2) * 111
                    available.append({**b, "distance_km": round(dist, 2), "expansion_ring": ring})

            if available:
                available.sort(key=lambda x: (x["distance_km"], -x["rating"]))
                return {"beauticians": available, "expansion_ring": ring, "zone_expanded": ring > 0}
    else:
        # Fallback: pure haversine within 20 km
        beauticians = await db.beauticians.find({"active": True, "on_duty": {"$ne": False}}, {"_id": 0}).to_list(200)
        available = []
        for b in beauticians:
            if payload.service_id not in b.get("skills", []):
                continue
            dlat = math.radians(b["lat"] - lat)
            dlng = math.radians(b["lng"] - lng)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(b["lat"])) * math.sin(dlng/2)**2
            dist = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            if dist > 20:
                continue
            conflict = await db.bookings.find_one({
                "beautician_id": b["id"],
                "date": payload.date,
                "time_slot": payload.time_slot,
                "status": {"$nin": ["cancelled"]},
            })
            if not conflict:
                available.append({**b, "distance_km": round(dist, 2), "expansion_ring": 0})
        available.sort(key=lambda x: (x["distance_km"], -x["rating"]))
        return {"beauticians": available[:10], "expansion_ring": 0, "zone_expanded": False}

    return {"beauticians": [], "expansion_ring": -1, "zone_expanded": False}


@router.get("/admin/beauticians")
async def admin_list_beauticians(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    docs = await db.beauticians.find({}, {"_id": 0}).sort("rating", -1).to_list(200)
    return docs


@router.post("/admin/beauticians")
async def admin_create_beautician(payload: BeauticianCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    doc = {
        "id": str(uuid.uuid4()),
        **payload.model_dump(),
        "h3_index": _h3_cell(payload.lat, payload.lng),
        "reviews_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.beauticians.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/admin/beauticians/{bid}")
async def admin_update_beautician(bid: str, payload: BeauticianCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    update = {**payload.model_dump(), "h3_index": _h3_cell(payload.lat, payload.lng)}
    await db.beauticians.update_one({"id": bid}, {"$set": update})
    doc = await db.beauticians.find_one({"id": bid}, {"_id": 0})
    if not doc:
        raise HTTPException(404)
    return doc


@router.delete("/admin/beauticians/{bid}")
async def admin_delete_beautician(bid: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.beauticians.delete_one({"id": bid})
    return {"ok": True}


@router.get("/admin/service-bookings")
async def admin_list_service_bookings(page: int = Query(1, ge=1), authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    skip = (page - 1) * 25
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(25).to_list(25)
    total = await db.bookings.count_documents({})
    return {"items": docs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / 25))}


@router.patch("/admin/service-bookings/{bid}/status")
async def admin_update_booking_status(bid: str, payload: BookingStatusUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": payload.status}})
    doc = await db.bookings.find_one({"id": bid}, {"_id": 0})
    return doc or {"id": bid, "status": payload.status}


@router.patch("/admin/service-bookings/{bid}/address")
async def admin_update_booking_address(bid: str, payload: BookingAddressUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    upd: dict = {"address": payload.address}
    if payload.notes is not None:
        upd["notes"] = payload.notes
    await db.bookings.update_one({"id": bid}, {"$set": upd})
    doc = await db.bookings.find_one({"id": bid}, {"_id": 0})
    return doc or {"id": bid}


@router.patch("/admin/beauticians/{bid}/duty")
async def admin_toggle_beautician_duty(bid: str, payload: AdminDutyUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.beauticians.update_one({"id": bid}, {"$set": {"on_duty": payload.on_duty}})
    return {"ok": True, "on_duty": payload.on_duty}


# ── Beautician self-service duty portal ──────────────────────────────────────

@router.get("/beauticians/profile")
async def get_beautician_profile(phone: str):
    """Phone-based lookup for beautician duty portal — no auth, read-only."""
    clean = "".join(c for c in phone if c.isdigit())[-10:]
    doc = await db.beauticians.find_one(
        {"$expr": {"$eq": [{"$substrCP": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}, clean]}},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(404, "No beautician found with this phone number")
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    bookings_today = await db.bookings.count_documents({
        "beautician_id": doc.get("id"), "date": today, "status": {"$nin": ["cancelled"]},
    })
    return {**doc, "bookings_today": bookings_today}


@router.patch("/beauticians/duty")
async def toggle_beautician_duty(payload: DutyUpdate):
    """Beautician self-toggles duty status. When going On Duty with GPS, updates h3_index and area."""
    clean = "".join(c for c in payload.phone if c.isdigit())[-10:]
    update_data: dict = {"on_duty": payload.on_duty}
    if payload.on_duty and payload.lat is not None and payload.lng is not None:
        update_data["lat"] = payload.lat
        update_data["lng"] = payload.lng
        h3 = _h3_cell(payload.lat, payload.lng)
        if h3:
            update_data["h3_index"] = h3
        area = _nearest_area(payload.lat, payload.lng)
        if area:
            update_data["area"] = area
    result = await db.beauticians.update_one(
        {"$expr": {"$eq": [{"$substrCP": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}, clean]}},
        {"$set": update_data},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "No beautician found with this phone number")
    doc = await db.beauticians.find_one(
        {"$expr": {"$eq": [{"$substrCP": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}, clean]}},
        {"_id": 0},
    )
    return doc


@router.get("/beauticians/surge-zones")
async def get_surge_zones():
    """Return areas with ≤1 on-duty beautician — surge earning opportunity for off-duty ones."""
    pipeline = [
        {"$match": {"active": True}},
        {"$group": {
            "_id": "$area",
            "on_duty_count": {"$sum": {"$cond": [{"$ne": ["$on_duty", False]}, 1, 0]}},
            "total": {"$sum": 1},
        }},
        {"$match": {"on_duty_count": {"$lte": 1}}},
        {"$project": {"area": "$_id", "on_duty_count": 1, "total": 1, "_id": 0}},
        {"$sort": {"on_duty_count": 1}},
    ]
    zones = await db.beauticians.aggregate(pipeline).to_list(50)
    return zones


# ── Beautician KYC / application flow ─────────────────────────────────────────

@router.post("/beauticians/apply", status_code=201)
async def submit_beautician_application(payload: BeauticianApplication):
    clean = "".join(c for c in payload.phone if c.isdigit())[-10:]
    existing = await db.beautician_applications.find_one(
        {"phone": {"$regex": clean + "$"}, "status": {"$in": ["pending_review", "approved"]}},
    )
    if existing:
        raise HTTPException(409, "An active application already exists for this phone number")
    doc = payload.dict()
    doc["phone"] = clean
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.beautician_applications.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@router.get("/beauticians/application-status")
async def get_beautician_application_status(phone: str):
    clean = "".join(c for c in phone if c.isdigit())[-10:]
    doc = await db.beautician_applications.find_one(
        {"phone": {"$regex": clean + "$"}},
        {"_id": 0, "selfie_b64": 0, "id_proof_b64": 0},
        sort=[("created_at", -1)],
    )
    if not doc:
        raise HTTPException(404, "No application found for this phone number")
    return doc


@router.get("/admin/beauticians/applications")
async def admin_list_applications(
    status: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    filt = {}
    if status:
        filt["status"] = status
    docs = await db.beautician_applications.find(filt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.patch("/admin/beauticians/applications/{app_id}/review")
async def review_beautician_application(
    app_id: str,
    payload: ApplicationReview,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    if payload.action not in ("approve", "reject"):
        raise HTTPException(400, "action must be 'approve' or 'reject'")
    app_doc = await db.beautician_applications.find_one({"id": app_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(404, "Application not found")
    if app_doc.get("status") != "pending_review":
        raise HTTPException(409, f"Application is already {app_doc.get('status')}")

    if payload.action == "approve":
        beautician_doc = {
            "id": str(uuid.uuid4()),
            "name": app_doc["name"],
            "phone": app_doc["phone"],
            "photo": app_doc.get("selfie_b64", ""),
            "lat": app_doc.get("lat", 17.3850),
            "lng": app_doc.get("lng", 78.4867),
            "area": app_doc["area"],
            "skills": app_doc.get("skills", []),
            "rating": 5.0,
            "rating_count": 0,
            "reviews_count": 0,
            "active": True,
            "on_duty": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        beautician_doc["h3_index"] = _h3_cell(beautician_doc["lat"], beautician_doc["lng"])
        await db.beauticians.insert_one(beautician_doc)
        await db.beautician_applications.update_one(
            {"id": app_id},
            {"$set": {"status": "approved", "reviewed_at": datetime.now(timezone.utc).isoformat()}},
        )
        return {"ok": True, "beautician_id": beautician_doc["id"]}
    else:
        if not payload.rejection_reason:
            raise HTTPException(400, "rejection_reason is required when rejecting")
        await db.beautician_applications.update_one(
            {"id": app_id},
            {"$set": {
                "status": "rejected",
                "rejection_reason": payload.rejection_reason,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }},
        )
        return {"ok": True}


