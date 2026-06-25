"""
ZiyaNisa — FastAPI backend.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Query, Header, File, UploadFile, Form
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
import uuid
import math
import io
import base64
import json as _json
import httpx
from datetime import datetime, timezone, timedelta

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

app = FastAPI(title="ZiyaNisa API", version="0.1.0")
api_router = APIRouter(prefix="/api")

# ── Auth config ───────────────────────────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "ziya-nisa-dev-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30
DEV_MODE = os.environ.get("ENVIRONMENT", "development") == "development"
ADMIN_PHONE   = os.environ.get("ADMIN_PHONE", "")  # e.g. "918341372666"
OLLAMA_HOST   = os.environ.get("OLLAMA_HOST",  "http://localhost:11434")
VISION_MODEL  = os.environ.get("VISION_MODEL", "moondream")

# In-memory OTP store: { contact → { otp, expires } }
OTP_STORE: dict = {}

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
    if not ADMIN_PHONE:
        return False
    return normalize_phone(contact)[-10:] == normalize_phone(ADMIN_PHONE)[-10:]

def is_admin_claims(claims: dict) -> bool:
    return is_admin_contact(claims.get("contact", ""))


# ── Models ────────────────────────────────────────────────────────────────────

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class Category(BaseModel):
    id: str
    label: str
    img: str

class Product(BaseModel):
    id: str
    name: str
    brand: str
    price: int
    mrp: int
    rating: float
    reviews: int
    img: str
    images: List[str] = []      # additional gallery images
    badges: List[str] = []
    actives: List[str] = []
    category_id: Optional[str] = None
    in_stock: bool = True

class Service(BaseModel):
    id: str
    name: str
    duration: str
    price: int
    rating: float
    img: str
    level: str
    tag: str

class ProductsPage(BaseModel):
    items: List[Product]
    total: int
    page: int
    total_pages: int

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    source: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    email: str
    source: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: list
    total: int
    upi_ref: Optional[str] = None
    status: str = "pending_payment"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None
    shipping_address: Optional[dict] = None
    billing_address: Optional[dict] = None
    coupon_code: Optional[str] = None
    discount: int = 0
    tracking_url: Optional[str] = None

class OrderCreate(BaseModel):
    items: list
    total: int
    shipping_address: Optional[dict] = None
    billing_address: Optional[dict] = None
    coupon_code: Optional[str] = None
    discount: int = 0

class UserOut(BaseModel):
    id: str
    name: Optional[str] = None
    contact: str
    is_admin: bool = False

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    user_name: str
    rating: int          # 1–5
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class WishlistToggle(BaseModel):
    product: dict        # full product object to store

class AddressCreate(BaseModel):
    label: str = "Home"          # "Home" | "Work" | "Other"
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pin: str
    is_default: bool = False

class AddressOut(AddressCreate):
    id: str

class CouponValidateInput(BaseModel):
    code: str
    total: int                   # cart subtotal before discount

class CouponOut(BaseModel):
    code: str
    type: str
    value: int
    min_order: int = 0
    max_discount: Optional[int] = None
    discount: int                # computed discount amount
    final_total: int
    label: str                   # human-readable description

class SkinProfileCreate(BaseModel):
    skin_type: str               # "oily" | "dry" | "combination" | "normal" | "sensitive"
    concerns: List[str]          # ["acne","dark_spots","aging","dullness","pores","sensitivity"]
    skin_tone: str               # "fair" | "medium" | "dusky" | "deep"
    sensitivity: str             # "low" | "medium" | "high"

class SkinProfileOut(SkinProfileCreate):
    id: str
    updated_at: str

class ProductCreate(BaseModel):
    name: str
    brand: str
    price: int
    mrp: int
    rating: float = 4.5
    reviews: int = 0
    img: str
    images: List[str] = []
    badges: List[str] = []
    actives: List[str] = []
    category_id: Optional[str] = None
    in_stock: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[int] = None
    mrp: Optional[int] = None
    rating: Optional[float] = None
    reviews: Optional[int] = None
    img: Optional[str] = None
    images: Optional[List[str]] = None
    badges: Optional[List[str]] = None
    actives: Optional[List[str]] = None
    category_id: Optional[str] = None
    in_stock: Optional[bool] = None

class WaitlistCreate(BaseModel):
    contact: str

class SendOtpInput(BaseModel):
    contact: str

class VerifyOtpInput(BaseModel):
    contact: str
    otp: str

class UpdateProfileInput(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class TokenOut(BaseModel):
    access_token: str
    user: UserOut


# ── Seed data ─────────────────────────────────────────────────────────────────

CATEGORIES_SEED: List[dict] = [
    {"id": "skincare",  "label": "Skincare",          "img": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80"},
    {"id": "haircare",  "label": "Haircare",           "img": "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800&q=80"},
    {"id": "makeup",    "label": "Makeup",             "img": "https://images.unsplash.com/photo-1586495777744-4e6232bf0340?w=800&q=80"},
    {"id": "bath-body", "label": "Bath & Body",        "img": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80"},
    {"id": "fragrance", "label": "Fragrance & Ittar",  "img": "https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?w=800&q=80"},
    {"id": "jewellery", "label": "Jewellery",          "img": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"},
    {"id": "handbags",  "label": "Handbags",           "img": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"},
    {"id": "tools",     "label": "Beauty Tools",       "img": "https://images.unsplash.com/photo-1598030304671-5aa1d6f9e78f?w=800&q=80"},
    {"id": "mens",      "label": "Men's Grooming",     "img": "https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?w=800&q=80"},
    {"id": "bridal",    "label": "Bridal & Occasion",  "img": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80"},
]

PRODUCTS_SEED: List[dict] = [
    # SKINCARE
    {"id":"p-sk-01","name":"SPF 50 Glow Shield","brand":"SeoulSaffron","price":1299,"mrp":1599,"rating":4.7,"reviews":1284,"img":"https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80","badges":["K-Glow","Clean Pick"],"actives":["Saffron","Niacinamide","Ceramide"],"category_id":"skincare"},
    {"id":"p-sk-02","name":"10% Niacinamide Serum","brand":"NoorActives","price":749,"mrp":999,"rating":4.8,"reviews":3210,"img":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80","badges":["Derm-Backed","Vegan"],"actives":["Niacinamide","Zinc"],"category_id":"skincare"},
    {"id":"p-sk-03","name":"Ceramide Barrier Cream","brand":"PearlRoot","price":1099,"mrp":1399,"rating":4.6,"reviews":942,"img":"https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80","badges":["K-Glow","Fragrance-Free"],"actives":["Ceramide","Hyaluronic Acid"],"category_id":"skincare"},
    {"id":"p-sk-04","name":"Rice Water Gel Cleanser","brand":"AquaZiya","price":549,"mrp":699,"rating":4.5,"reviews":1820,"img":"https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80","badges":["Korean-Inspired"],"actives":["Rice Water","Centella"],"category_id":"skincare"},
    {"id":"p-sk-05","name":"Rose Mist Toner","brand":"Deccan Dew","price":499,"mrp":649,"rating":4.4,"reviews":612,"img":"https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80","badges":["Organic"],"actives":["Rose","Aloe Vera"],"category_id":"skincare"},
    {"id":"p-sk-06","name":"Aloe Saffron Moisturizer","brand":"Nisa Botanics","price":899,"mrp":1199,"rating":4.7,"reviews":2104,"img":"https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=800&q=80","badges":["Clean Pick","Cruelty-Free"],"actives":["Saffron","Aloe Vera"],"category_id":"skincare"},
    {"id":"p-sk-07","name":"Vitamin C Brightening Drops","brand":"GlowSutra","price":1199,"mrp":1499,"rating":4.6,"reviews":1543,"img":"https://images.unsplash.com/photo-1567721913486-6585f069b406?w=800&q=80","badges":["Derm-Backed"],"actives":["Vitamin C","Ferulic Acid"],"category_id":"skincare"},
    {"id":"p-sk-08","name":"Lip Repair Balm","brand":"RoseCeramide","price":349,"mrp":449,"rating":4.5,"reviews":880,"img":"https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80","badges":["Bridal Favorite"],"actives":["Shea","Ceramide"],"category_id":"skincare"},
    {"id":"p-sk-09","name":"Hyaluronic Eye Gel","brand":"KoraCare","price":649,"mrp":849,"rating":4.6,"reviews":710,"img":"https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=800&q=80","badges":["K-Glow"],"actives":["HA","Peptides"],"category_id":"skincare"},
    {"id":"p-sk-10","name":"Retinol Night Renewal Cream","brand":"NoorActives","price":1399,"mrp":1799,"rating":4.7,"reviews":1102,"img":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80","badges":["Derm-Backed"],"actives":["Retinol","Bakuchiol","Ceramide"],"category_id":"skincare"},
    # HAIRCARE
    {"id":"p-hc-01","name":"Rice Protein Shampoo","brand":"KoraCare","price":399,"mrp":499,"rating":4.5,"reviews":1340,"img":"https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800&q=80","badges":["Sulfate-Free"],"actives":["Rice Protein","Biotin"],"category_id":"haircare"},
    {"id":"p-hc-02","name":"Bhringraj Hair Oil","brand":"NisaRoots","price":449,"mrp":599,"rating":4.7,"reviews":2890,"img":"https://images.unsplash.com/photo-1559595500-e15296712d55?w=800&q=80","badges":["Ayurvedic"],"actives":["Bhringraj","Amla","Coconut"],"category_id":"haircare"},
    {"id":"p-hc-03","name":"Keratin Repair Mask","brand":"SilkNisa","price":799,"mrp":999,"rating":4.6,"reviews":980,"img":"https://images.unsplash.com/photo-1628528402885-d9a9a6dcabb1?w=800&q=80","badges":["Salon-Grade"],"actives":["Keratin","Argan","Protein"],"category_id":"haircare"},
    {"id":"p-hc-04","name":"Onion Black Seed Oil","brand":"NisaRoots","price":349,"mrp":449,"rating":4.8,"reviews":4210,"img":"https://images.unsplash.com/photo-1519825933820-54e4a53b85a5?w=800&q=80","badges":["Ayurvedic","Bestseller"],"actives":["Onion","Kalonji","Castor"],"category_id":"haircare"},
    {"id":"p-hc-05","name":"Fenugreek Scalp Serum","brand":"GlowSutra","price":699,"mrp":899,"rating":4.5,"reviews":560,"img":"https://images.unsplash.com/photo-1574870111867-089730e5a72b?w=800&q=80","badges":["Anti-Dandruff"],"actives":["Fenugreek","Salicylic Acid"],"category_id":"haircare"},
    {"id":"p-hc-06","name":"Argan Shine Conditioner","brand":"SilkNisa","price":499,"mrp":649,"rating":4.4,"reviews":830,"img":"https://images.unsplash.com/photo-1599552900626-2cc58bb15e00?w=800&q=80","badges":["Vegan"],"actives":["Argan","Vitamin E"],"category_id":"haircare"},
    {"id":"p-hc-07","name":"Anti-Frizz Serum","brand":"KoraCare","price":549,"mrp":699,"rating":4.6,"reviews":1230,"img":"https://images.unsplash.com/photo-1524000835948-7980f3e1cc63?w=800&q=80","badges":["Heat-Protect"],"actives":["Silicone-Free","Camellia Oil"],"category_id":"haircare"},
    {"id":"p-hc-08","name":"Biotin Growth Drops","brand":"NoorActives","price":899,"mrp":1199,"rating":4.7,"reviews":1780,"img":"https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80","badges":["Clinically Tested"],"actives":["Biotin","Redensyl","Caffeine"],"category_id":"haircare"},
    {"id":"p-hc-09","name":"Hair Detox Scalp Scrub","brand":"AquaZiya","price":449,"mrp":599,"rating":4.3,"reviews":490,"img":"https://images.unsplash.com/photo-1600857062241-98e5dba7f025?w=800&q=80","badges":["Clean Pick"],"actives":["Sea Salt","Peppermint","AHA"],"category_id":"haircare"},
    {"id":"p-hc-10","name":"Cold Press Coconut Hair Butter","brand":"Deccan Dew","price":299,"mrp":399,"rating":4.5,"reviews":2100,"img":"https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=800&q=80","badges":["Organic"],"actives":["Coconut","Shea","Hibiscus"],"category_id":"haircare"},
    # MAKEUP
    {"id":"p-mk-01","name":"Saffron Glow Foundation","brand":"NisaBeauty","price":999,"mrp":1299,"rating":4.6,"reviews":1450,"img":"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80","badges":["SPF 20","Vegan"],"actives":["Saffron","Hyaluronic Acid"],"category_id":"makeup"},
    {"id":"p-mk-02","name":"Kajal Kohl Liner","brand":"KoraCare","price":199,"mrp":249,"rating":4.8,"reviews":5420,"img":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80","badges":["Waterproof","Bestseller"],"actives":["Kohl","Vitamin E"],"category_id":"makeup"},
    {"id":"p-mk-03","name":"Rose Velvet Lipstick","brand":"NisaBeauty","price":399,"mrp":499,"rating":4.7,"reviews":2380,"img":"https://images.unsplash.com/photo-1586495777744-4e6232bf0340?w=800&q=80","badges":["Long-Lasting"],"actives":["Shea","Jojoba"],"category_id":"makeup"},
    {"id":"p-mk-04","name":"K-Glow Highlighter Palette","brand":"GlowSutra","price":849,"mrp":1099,"rating":4.8,"reviews":1780,"img":"https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=800&q=80","badges":["K-Glow"],"actives":["Pearl","Mica"],"category_id":"makeup"},
    {"id":"p-mk-05","name":"CC Cream SPF 30","brand":"SeoulSaffron","price":749,"mrp":999,"rating":4.5,"reviews":960,"img":"https://images.unsplash.com/photo-1503236823255-94609f598e71?w=800&q=80","badges":["SPF 30","K-Beauty"],"actives":["Niacinamide","Ceramide"],"category_id":"makeup"},
    {"id":"p-mk-06","name":"Volume Mascara","brand":"NisaBeauty","price":449,"mrp":549,"rating":4.6,"reviews":1120,"img":"https://images.unsplash.com/photo-1583241475880-083f84372725?w=800&q=80","badges":["Waterproof"],"actives":["Vitamin B5","Beeswax"],"category_id":"makeup"},
    {"id":"p-mk-07","name":"Nude Glow Eyeshadow Palette","brand":"GlowSutra","price":1199,"mrp":1499,"rating":4.7,"reviews":2040,"img":"https://images.unsplash.com/photo-1522335789203-aaa2f6b6d3a4?w=800&q=80","badges":["Derm-Backed"],"actives":["Mica","Jojoba"],"category_id":"makeup"},
    {"id":"p-mk-08","name":"Brow Definer Pencil","brand":"KoraCare","price":299,"mrp":399,"rating":4.5,"reviews":870,"img":"https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80","badges":["Vegan"],"actives":["Carnauba Wax"],"category_id":"makeup"},
    {"id":"p-mk-09","name":"Dewy Setting Mist","brand":"AquaZiya","price":499,"mrp":649,"rating":4.6,"reviews":1310,"img":"https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=800&q=80","badges":["Clean Pick"],"actives":["Rose Water","Glycerin"],"category_id":"makeup"},
    {"id":"p-mk-10","name":"Blush Duo — Peach & Rose","brand":"NisaBeauty","price":649,"mrp":849,"rating":4.7,"reviews":930,"img":"https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=800&q=80","badges":["Buildable"],"actives":["Pearl","Mica","Vitamin E"],"category_id":"makeup"},
    # BATH & BODY
    {"id":"p-bb-01","name":"Sandalwood Body Butter","brand":"Deccan Dew","price":699,"mrp":899,"rating":4.8,"reviews":1680,"img":"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80","badges":["Organic","Vegan"],"actives":["Sandalwood","Shea","Vitamin E"],"category_id":"bath-body"},
    {"id":"p-bb-02","name":"Rose Petal Body Scrub","brand":"Nisa Botanics","price":549,"mrp":699,"rating":4.6,"reviews":1040,"img":"https://images.unsplash.com/photo-1584815231895-b19b75b18f23?w=800&q=80","badges":["Clean Pick"],"actives":["Rose","Sugar","Jojoba Beads"],"category_id":"bath-body"},
    {"id":"p-bb-03","name":"Kumkumadi Body Oil","brand":"NisaRoots","price":849,"mrp":1099,"rating":4.7,"reviews":870,"img":"https://images.unsplash.com/photo-1536308537997-e0b15a5b6d4a?w=800&q=80","badges":["Ayurvedic"],"actives":["Saffron","Kumkumadi","Sesame"],"category_id":"bath-body"},
    {"id":"p-bb-04","name":"Jasmine Shower Gel","brand":"AquaZiya","price":399,"mrp":499,"rating":4.4,"reviews":760,"img":"https://images.unsplash.com/photo-1612785604403-e97e5d8df1d8?w=800&q=80","badges":["SLS-Free"],"actives":["Jasmine","Aloe","Glycerin"],"category_id":"bath-body"},
    {"id":"p-bb-05","name":"Ubtan Brightening Pack","brand":"NisaRoots","price":349,"mrp":449,"rating":4.8,"reviews":3210,"img":"https://images.unsplash.com/photo-1590080876351-41db8d0d8e91?w=800&q=80","badges":["Ayurvedic","Bestseller"],"actives":["Turmeric","Sandalwood","Chickpea"],"category_id":"bath-body"},
    {"id":"p-bb-06","name":"Coffee Body Polisher","brand":"GlowSutra","price":449,"mrp":599,"rating":4.6,"reviews":920,"img":"https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80","badges":["Vegan"],"actives":["Coffee","Coconut","Sea Salt"],"category_id":"bath-body"},
    {"id":"p-bb-07","name":"Neem Antibacterial Soap","brand":"Nisa Botanics","price":149,"mrp":199,"rating":4.5,"reviews":4580,"img":"https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&q=80","badges":["Ayurvedic"],"actives":["Neem","Turmeric","Tulsi"],"category_id":"bath-body"},
    {"id":"p-bb-08","name":"Foot Repair Cream","brand":"Deccan Dew","price":299,"mrp":399,"rating":4.5,"reviews":640,"img":"https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80","badges":["Intensive Care"],"actives":["Urea","Shea","Peppermint"],"category_id":"bath-body"},
    {"id":"p-bb-09","name":"Under-Arm Brightener Serum","brand":"GlowSutra","price":499,"mrp":649,"rating":4.4,"reviews":510,"img":"https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80","badges":["Derm-Backed"],"actives":["Kojic Acid","Niacinamide","AHA"],"category_id":"bath-body"},
    {"id":"p-bb-10","name":"Hand & Nail Cream","brand":"Nisa Botanics","price":249,"mrp":329,"rating":4.6,"reviews":1450,"img":"https://images.unsplash.com/photo-1601049676869-702ea24cfd58?w=800&q=80","badges":["Vegan"],"actives":["Rose Hip","Biotin","Glycerin"],"category_id":"bath-body"},
    # FRAGRANCE
    {"id":"p-fr-01","name":"Oud Bloom Ittar","brand":"Deccan Dew","price":1299,"mrp":1599,"rating":4.9,"reviews":2340,"img":"https://images.unsplash.com/photo-1543422655-ac1c6ca993ed?w=800&q=80","badges":["Pure Attar"],"actives":["Oud","Rose","Resin"],"category_id":"fragrance"},
    {"id":"p-fr-02","name":"Saffron Veil Attar","brand":"Deccan Dew","price":1499,"mrp":1999,"rating":4.8,"reviews":1120,"img":"https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80","badges":["Pure Attar"],"actives":["Saffron","Amber","Musk"],"category_id":"fragrance"},
    {"id":"p-fr-03","name":"Sandal Mist EDP","brand":"Nisa Atelier","price":1899,"mrp":2499,"rating":4.7,"reviews":890,"img":"https://images.unsplash.com/photo-1458538977777-0549b2370168?w=800&q=80","badges":["Long-Lasting"],"actives":["Sandalwood","Vanilla","Vetiver"],"category_id":"fragrance"},
    {"id":"p-fr-04","name":"Hyderabadi Rose EDP","brand":"Nisa Atelier","price":2199,"mrp":2799,"rating":4.8,"reviews":740,"img":"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80","badges":["Bridal Favorite"],"actives":["Damask Rose","Honey","Jasmine"],"category_id":"fragrance"},
    {"id":"p-fr-05","name":"Oud Noir Parfum","brand":"Deccan Dew","price":2999,"mrp":3999,"rating":4.9,"reviews":460,"img":"https://images.unsplash.com/photo-1547887538-047fd1ec4e72?w=800&q=80","badges":["Pure Oud"],"actives":["Oud","Patchouli","Amber"],"category_id":"fragrance"},
    {"id":"p-fr-06","name":"Jasmine Musk Body Spray","brand":"AquaZiya","price":599,"mrp":799,"rating":4.5,"reviews":1890,"img":"https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80","badges":["Everyday Wear"],"actives":["Jasmine","White Musk"],"category_id":"fragrance"},
    {"id":"p-fr-07","name":"Amber Wood Cologne","brand":"Nisa Atelier","price":1699,"mrp":2199,"rating":4.6,"reviews":570,"img":"https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&q=80","badges":["Unisex"],"actives":["Amber","Cedarwood","Bergamot"],"category_id":"fragrance"},
    {"id":"p-fr-08","name":"Rose Oud Attar Oil","brand":"Deccan Dew","price":999,"mrp":1299,"rating":4.7,"reviews":1340,"img":"https://images.unsplash.com/photo-1594032194509-0056023973b2?w=800&q=80","badges":["Pure Attar","No Alcohol"],"actives":["Rose","Oud"],"category_id":"fragrance"},
    {"id":"p-fr-09","name":"Champagne Bloom EDP","brand":"Nisa Atelier","price":2499,"mrp":3199,"rating":4.7,"reviews":380,"img":"https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=800&q=80","badges":["Luxury"],"actives":["Champagne Rose","Peach","Musk"],"category_id":"fragrance"},
    {"id":"p-fr-10","name":"Black Amber Parfum","brand":"Deccan Dew","price":1799,"mrp":2299,"rating":4.8,"reviews":510,"img":"https://images.unsplash.com/photo-1518302057130-f72e1ab36f1b?w=800&q=80","badges":["Intense"],"actives":["Black Musk","Amber","Labdanum"],"category_id":"fragrance"},
    # JEWELLERY
    {"id":"p-jw-01","name":"Ziya Pearl Drop Earrings","brand":"Nisa Atelier","price":2499,"mrp":3199,"rating":4.9,"reviews":870,"img":"https://images.pexels.com/photos/36772547/pexels-photo-36772547.jpeg?auto=compress&w=800","badges":["Bridal","Bestseller"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-02","name":"Champagne Halo Necklace","brand":"Nisa Atelier","price":4299,"mrp":5499,"rating":4.8,"reviews":540,"img":"https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80","badges":["Gold-Plated"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-03","name":"Bridal Kundan Set","brand":"Nisa Atelier","price":8999,"mrp":11999,"rating":4.9,"reviews":310,"img":"https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80","badges":["Bridal","Handcrafted"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-04","name":"Gold Layered Anklet","brand":"NisaGold","price":999,"mrp":1299,"rating":4.6,"reviews":720,"img":"https://images.unsplash.com/photo-1573408301185-9519f94eae1c?w=800&q=80","badges":["Gold-Plated"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-05","name":"Emerald Stud Earrings","brand":"NisaGold","price":1799,"mrp":2299,"rating":4.7,"reviews":430,"img":"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80","badges":["Statement"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-06","name":"Maang Tikka — Temple Gold","brand":"Nisa Atelier","price":1599,"mrp":1999,"rating":4.8,"reviews":640,"img":"https://images.unsplash.com/photo-1599459182681-c938b7a53fd0?w=800&q=80","badges":["Bridal","Traditional"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-07","name":"Floral Polki Ring","brand":"NisaGold","price":1299,"mrp":1699,"rating":4.7,"reviews":390,"img":"https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80","badges":["Handcrafted"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-08","name":"Temple Gold Choker","brand":"Nisa Atelier","price":3499,"mrp":4499,"rating":4.8,"reviews":490,"img":"https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&q=80","badges":["Bridal","Bestseller"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-09","name":"Diamond-Cut Bangle Pair","brand":"NisaGold","price":2299,"mrp":2999,"rating":4.6,"reviews":350,"img":"https://images.unsplash.com/photo-1609783695042-5c3e9c7f8bc9?w=800&q=80","badges":["Gold-Plated"],"actives":[],"category_id":"jewellery"},
    {"id":"p-jw-10","name":"Enamel Peacock Bracelet","brand":"Nisa Atelier","price":1199,"mrp":1499,"rating":4.7,"reviews":610,"img":"https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80","badges":["Statement"],"actives":[],"category_id":"jewellery"},
    # HANDBAGS
    {"id":"p-hb-01","name":"Gold Thread Clutch","brand":"Nisa Atelier","price":3199,"mrp":3999,"rating":4.8,"reviews":420,"img":"https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80","badges":["Bridal Favorite"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-02","name":"Silk Potli Bag","brand":"Nisa Atelier","price":1499,"mrp":1899,"rating":4.7,"reviews":730,"img":"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80","badges":["Handcrafted"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-03","name":"Beaded Minaudière","brand":"Nisa Atelier","price":2299,"mrp":2999,"rating":4.6,"reviews":310,"img":"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80","badges":["Occasion Wear"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-04","name":"Zardosi Evening Bag","brand":"Nisa Atelier","price":2799,"mrp":3499,"rating":4.8,"reviews":270,"img":"https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80","badges":["Handcrafted","Bridal"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-05","name":"Caramel Leather Sling","brand":"NisaLeather","price":1899,"mrp":2499,"rating":4.5,"reviews":560,"img":"https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=800&q=80","badges":["Everyday"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-06","name":"Velvet Box Clutch","brand":"Nisa Atelier","price":1699,"mrp":2199,"rating":4.7,"reviews":390,"img":"https://images.unsplash.com/photo-1547619292-240402b5ae5d?w=800&q=80","badges":["Occasion Wear"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-07","name":"Embroidered Shoulder Bag","brand":"Nisa Atelier","price":2199,"mrp":2799,"rating":4.6,"reviews":480,"img":"https://images.unsplash.com/photo-1582142306909-195724d33ffc?w=800&q=80","badges":["Handcrafted"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-08","name":"Pearl Handle Bucket Bag","brand":"NisaLeather","price":2599,"mrp":3299,"rating":4.7,"reviews":340,"img":"https://images.unsplash.com/photo-1601593346740-925612772716?w=800&q=80","badges":["Statement"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-09","name":"Mirror Work Tote","brand":"Nisa Atelier","price":1999,"mrp":2599,"rating":4.6,"reviews":410,"img":"https://images.unsplash.com/photo-1509069983856-2a8fe24b0f02?w=800&q=80","badges":["Handcrafted"],"actives":[],"category_id":"handbags"},
    {"id":"p-hb-10","name":"Nisa Monogram Canvas Bag","brand":"NisaLeather","price":3499,"mrp":4499,"rating":4.8,"reviews":290,"img":"https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80","badges":["Signature"],"actives":[],"category_id":"handbags"},
    # BEAUTY TOOLS
    {"id":"p-bt-01","name":"Rose Quartz Face Roller","brand":"KoraCare","price":799,"mrp":999,"rating":4.7,"reviews":2140,"img":"https://images.unsplash.com/photo-1598030304671-5aa1d6f9e78f?w=800&q=80","badges":["Anti-Puffiness"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-02","name":"Jade Gua Sha Stone","brand":"KoraCare","price":599,"mrp":799,"rating":4.8,"reviews":1870,"img":"https://images.unsplash.com/photo-1611080626919-7cf5a9dbab12?w=800&q=80","badges":["K-Glow","Lymphatic Drain"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-03","name":"Ice Globe Face Massager","brand":"GlowSutra","price":899,"mrp":1199,"rating":4.6,"reviews":980,"img":"https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80","badges":["Anti-Redness"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-04","name":"Electric Cleansing Brush","brand":"KoraCare","price":1499,"mrp":1999,"rating":4.5,"reviews":1340,"img":"https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80","badges":["Deep Clean"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-05","name":"Lash Curler — Rose Gold","brand":"NisaBeauty","price":349,"mrp":449,"rating":4.4,"reviews":720,"img":"https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80","badges":["Gentle Curl"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-06","name":"LED Face Mask 7-Colour","brand":"GlowSutra","price":3999,"mrp":5499,"rating":4.7,"reviews":540,"img":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80","badges":["Clinically Tested"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-07","name":"Pore Vacuum Mini","brand":"KoraCare","price":1299,"mrp":1699,"rating":4.5,"reviews":890,"img":"https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80","badges":["Blackhead Removal"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-08","name":"Dermaplaning Tool","brand":"NoorActives","price":699,"mrp":899,"rating":4.3,"reviews":430,"img":"https://images.unsplash.com/photo-1583241800698-e8ab01830a41?w=800&q=80","badges":["Peach Fuzz Remove"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-09","name":"Ultrasonic Skin Scrubber","brand":"GlowSutra","price":1799,"mrp":2399,"rating":4.6,"reviews":670,"img":"https://images.unsplash.com/photo-1532413992378-f169ac26fff0?w=800&q=80","badges":["Deep Exfoliant"],"actives":[],"category_id":"tools"},
    {"id":"p-bt-10","name":"Micro-Dermaroller 0.3mm","brand":"NoorActives","price":499,"mrp":699,"rating":4.4,"reviews":810,"img":"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80","badges":["Collagen Boost"],"actives":[],"category_id":"tools"},
    # MEN'S GROOMING
    {"id":"p-mg-01","name":"Charcoal Face Wash","brand":"ZiyaMen","price":349,"mrp":449,"rating":4.6,"reviews":2340,"img":"https://images.unsplash.com/photo-1581375074612-d1fd0e661aeb?w=800&q=80","badges":["Deep Clean"],"actives":["Charcoal","Salicylic Acid"],"category_id":"mens"},
    {"id":"p-mg-02","name":"Beard Oil — Oud & Cedar","brand":"ZiyaMen","price":599,"mrp":799,"rating":4.8,"reviews":1870,"img":"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80","badges":["Bestseller"],"actives":["Oud","Cedarwood","Jojoba"],"category_id":"mens"},
    {"id":"p-mg-03","name":"Sport SPF 50 Moisturizer","brand":"NoorActives","price":799,"mrp":1099,"rating":4.5,"reviews":980,"img":"https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80","badges":["SPF 50","Matte"],"actives":["Niacinamide","SPF","Hyaluronic"],"category_id":"mens"},
    {"id":"p-mg-04","name":"Activated Charcoal Mask","brand":"ZiyaMen","price":399,"mrp":499,"rating":4.5,"reviews":1230,"img":"https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80","badges":["Pore Care"],"actives":["Charcoal","Kaolin","Tea Tree"],"category_id":"mens"},
    {"id":"p-mg-05","name":"Under-Eye Dark Circle Serum","brand":"NoorActives","price":749,"mrp":999,"rating":4.6,"reviews":710,"img":"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80","badges":["Derm-Backed"],"actives":["Vitamin K","Caffeine","Peptides"],"category_id":"mens"},
    {"id":"p-mg-06","name":"Hair Pomade — Matte Finish","brand":"ZiyaMen","price":349,"mrp":449,"rating":4.4,"reviews":890,"img":"https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=800&q=80","badges":["Strong Hold"],"actives":["Beeswax","Lanolin"],"category_id":"mens"},
    {"id":"p-mg-07","name":"Aloe Shaving Gel","brand":"AquaZiya","price":249,"mrp":329,"rating":4.5,"reviews":1560,"img":"https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80","badges":["Sensitive Skin"],"actives":["Aloe","Glycerin","Chamomile"],"category_id":"mens"},
    {"id":"p-mg-08","name":"Post-Shave Balm","brand":"ZiyaMen","price":299,"mrp":399,"rating":4.6,"reviews":1100,"img":"https://images.unsplash.com/photo-1556228853-80b6e5eeff06?w=800&q=80","badges":["Anti-Irritation"],"actives":["Allantoin","Witch Hazel","Aloe"],"category_id":"mens"},
    {"id":"p-mg-09","name":"Neem Tea Tree Soap","brand":"NisaRoots","price":149,"mrp":199,"rating":4.5,"reviews":3400,"img":"https://images.unsplash.com/photo-1584815231895-b19b75b18f23?w=800&q=80","badges":["Antibacterial"],"actives":["Neem","Tea Tree","Salicylic Acid"],"category_id":"mens"},
    {"id":"p-mg-10","name":"Men's Anti-Aging Serum","brand":"NoorActives","price":999,"mrp":1299,"rating":4.7,"reviews":630,"img":"https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80","badges":["Derm-Backed"],"actives":["Retinol","Peptides","Niacinamide"],"category_id":"mens"},
    # BRIDAL
    {"id":"p-br-01","name":"Bridal Noor Makeup Kit","brand":"NisaBeauty","price":4999,"mrp":6499,"rating":4.9,"reviews":430,"img":"https://images.unsplash.com/photo-1522335789203-aaa2f6b6d3a4?w=800&q=80","badges":["Bridal Essential"],"actives":[],"category_id":"bridal"},
    {"id":"p-br-02","name":"Mehendi Prep Brightening Serum","brand":"GlowSutra","price":849,"mrp":1099,"rating":4.7,"reviews":560,"img":"https://images.unsplash.com/photo-1567721913486-6585f069b406?w=800&q=80","badges":["Bridal"],"actives":["Vitamin C","AHA","Niacinamide"],"category_id":"bridal"},
    {"id":"p-br-03","name":"Bridal Glow Sheet Mask","brand":"SeoulSaffron","price":299,"mrp":399,"rating":4.8,"reviews":1840,"img":"https://images.unsplash.com/photo-1598452963314-b09f397a5c48?w=800&q=80","badges":["K-Glow","Wedding Day"],"actives":["Saffron","HA","Collagen"],"category_id":"bridal"},
    {"id":"p-br-04","name":"Saffron Bridal Cream","brand":"Nisa Botanics","price":1299,"mrp":1699,"rating":4.8,"reviews":790,"img":"https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80","badges":["Bridal","Glow"],"actives":["Saffron","Pearl","Kumkumadi"],"category_id":"bridal"},
    {"id":"p-br-05","name":"Bridal Red Lip Set","brand":"NisaBeauty","price":899,"mrp":1199,"rating":4.8,"reviews":870,"img":"https://images.unsplash.com/photo-1586495777744-4e6232bf0340?w=800&q=80","badges":["Bridal","Long-Lasting"],"actives":["Shea","Vitamin E"],"category_id":"bridal"},
    {"id":"p-br-06","name":"Kohl & Liner Bridal Set","brand":"NisaBeauty","price":599,"mrp":799,"rating":4.7,"reviews":640,"img":"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80","badges":["Bridal","Waterproof"],"actives":["Kohl","Vitamin E"],"category_id":"bridal"},
    {"id":"p-br-07","name":"Bridal Luminizer Drops","brand":"GlowSutra","price":699,"mrp":899,"rating":4.6,"reviews":510,"img":"https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=800&q=80","badges":["Highlighter"],"actives":["Pearl","Rose Gold Mica"],"category_id":"bridal"},
    {"id":"p-br-08","name":"Jasmine Bridal Body Mist","brand":"Deccan Dew","price":549,"mrp":699,"rating":4.7,"reviews":1230,"img":"https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80","badges":["Bridal","Long-Lasting"],"actives":["Jasmine","Sandalwood","Rose"],"category_id":"bridal"},
    {"id":"p-br-09","name":"Ubtan Bridal Pack","brand":"NisaRoots","price":499,"mrp":649,"rating":4.9,"reviews":3210,"img":"https://images.unsplash.com/photo-1590080876351-41db8d0d8e91?w=800&q=80","badges":["Ayurvedic","Glow"],"actives":["Turmeric","Sandalwood","Rose"],"category_id":"bridal"},
    {"id":"p-br-10","name":"Wedding Day Touch-Up Kit","brand":"NisaBeauty","price":1499,"mrp":1999,"rating":4.8,"reviews":720,"img":"https://images.unsplash.com/photo-1503236823255-94609f598e71?w=800&q=80","badges":["Bridal Essential"],"actives":[],"category_id":"bridal"},
]

SERVICES_SEED: List[dict] = [
    {"id":"s1","name":"Korean Glow Facial","duration":"75 min","price":1499,"rating":4.9,"img":"https://images.pexels.com/photos/30809943/pexels-photo-30809943.jpeg","level":"Senior","tag":"K-Glow"},
    {"id":"s2","name":"Saffron Brightening Cleanup","duration":"45 min","price":799,"rating":4.7,"img":"https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80","level":"Trained","tag":"Best Seller"},
    {"id":"s3","name":"Bridal Noor Makeup","duration":"180 min","price":11999,"rating":4.9,"img":"https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80","level":"Bridal Expert","tag":"Bridal"},
    {"id":"s4","name":"Pearl Pedicure","duration":"60 min","price":899,"rating":4.6,"img":"https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80","level":"Trained","tag":"Relax"},
]

COUPON_SEEDS: List[dict] = [
    {"code": "WELCOME200", "type": "first_order", "value": 200, "min_order": 999,  "active": True, "used_count": 0},
    {"code": "GLOW15",     "type": "percent",     "value": 15,  "min_order": 799,  "active": True, "used_count": 0, "max_discount": 500},
    {"code": "SKIN20",     "type": "percent",     "value": 20,  "min_order": 499,  "active": True, "used_count": 0, "max_discount": 400},
    {"code": "ZN50",       "type": "flat",        "value": 50,  "min_order": 299,  "active": True, "used_count": 0},
    {"code": "BRIDAL500",  "type": "flat",        "value": 500, "min_order": 3999, "active": True, "used_count": 0},
]

# Maps skin concerns/types → active ingredient keywords for personalization
CONCERN_ACTIVES: dict = {
    "acne":        ["niacinamide", "salicylic acid", "tea tree", "zinc", "kalonji", "charcoal"],
    "dark_spots":  ["vitamin c", "niacinamide", "kojic acid", "saffron", "alpha arbutin", "aha"],
    "aging":       ["retinol", "bakuchiol", "peptides", "vitamin c", "hyaluronic acid", "collagen"],
    "dullness":    ["vitamin c", "saffron", "niacinamide", "glycolic acid", "aha", "pearl"],
    "pores":       ["niacinamide", "salicylic acid", "zinc", "aha", "clay", "kaolin"],
    "sensitivity": ["aloe", "centella", "ceramide", "allantoin", "glycerin", "chamomile"],
    "oily":        ["niacinamide", "salicylic acid", "zinc", "clay", "charcoal", "kaolin"],
    "dry":         ["hyaluronic acid", "ceramide", "shea", "glycerin", "squalane", "argan"],
    "combination": ["niacinamide", "hyaluronic acid", "ceramide"],
    "normal":      ["hyaluronic acid", "vitamin c", "niacinamide"],
    "sensitive":   ["ceramide", "aloe", "centella", "glycerin", "allantoin"],
}


# ── Health endpoints ───────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "ZiyaNisa API · K-Glow Beauty, Deccan Grace, Delivered to You."}

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "ziyanisa-api", "version": "0.1.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    obj = StatusCheck(**input.model_dump())
    doc = obj.model_dump()
    doc["timestamp"] = doc["timestamp"].isoformat()
    await db.status_checks.insert_one(doc)
    return obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r["timestamp"], str):
            r["timestamp"] = datetime.fromisoformat(r["timestamp"])
    return rows


# ── Catalog endpoints ──────────────────────────────────────────────────────────

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(50)
    return cats if cats else CATEGORIES_SEED

SORT_MAP = {
    "rating":     [("rating", -1)],
    "reviews":    [("reviews", -1)],
    "price_asc":  [("price",  1)],
    "price_desc": [("price", -1)],
}

@api_router.get("/products", response_model=ProductsPage)
async def get_products(
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    sort: Optional[str] = Query(None),   # rating | reviews | price_asc | price_desc
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    query: dict = {}
    if category:
        query["category_id"] = category
    if q:
        query["$or"] = [
            {"name":  {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"actives": {"$regex": q, "$options": "i"}},
        ]
    mongo_sort = SORT_MAP.get(sort)
    total = await db.products.count_documents(query)
    if total == 0:
        # fallback: serve in-memory seed so the shop is never empty
        seed = PRODUCTS_SEED
        if category: seed = [p for p in seed if p.get("category_id") == category]
        if q:
            ql = q.lower()
            seed = [p for p in seed if ql in p["name"].lower() or ql in p["brand"].lower() or
                    any(ql in a.lower() for a in p.get("actives", []))]
        if sort == "rating":     seed = sorted(seed, key=lambda p: p.get("rating", 0), reverse=True)
        elif sort == "reviews":  seed = sorted(seed, key=lambda p: p.get("reviews", 0), reverse=True)
        elif sort == "price_asc":  seed = sorted(seed, key=lambda p: p.get("price", 0))
        elif sort == "price_desc": seed = sorted(seed, key=lambda p: p.get("price", 0), reverse=True)
        total = len(seed)
        skip = (page - 1) * limit
        items = seed[skip: skip + limit]
        return {"items": items, "total": total, "page": page, "total_pages": max(1, math.ceil(total / limit))}
    skip = (page - 1) * limit
    cursor = db.products.find(query, {"_id": 0}).skip(skip).limit(limit)
    if mongo_sort:
        cursor = cursor.sort(mongo_sort)
    items = await cursor.to_list(limit)
    return {"items": items, "total": total, "page": page, "total_pages": max(1, math.ceil(total / limit))}

@api_router.get("/products/for-me", response_model=ProductsPage)
async def products_for_me(
    limit: int = Query(8, ge=1, le=20),
    authorization: Optional[str] = Header(None),
):
    """Return products ranked by match to the user's skin profile."""
    profile = None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            profile = await db.skin_profiles.find_one({"user_id": claims["sub"]}, {"_id": 0})
        except Exception:
            pass

    all_products = await db.products.find({}, {"_id": 0}).to_list(500)
    if not all_products:
        all_products = PRODUCTS_SEED

    if not profile:
        # No profile — return top skincare/haircare by rating
        care = [p for p in all_products if p.get("category_id") in ("skincare", "haircare", "bath-body")]
        care = sorted(care, key=lambda p: p.get("rating", 0), reverse=True)[:limit]
        return {"items": care, "total": len(care), "page": 1, "total_pages": 1}

    # Build keyword set from skin type + concerns
    keywords: set = set()
    keywords.update(CONCERN_ACTIVES.get(profile.get("skin_type", ""), []))
    for concern in profile.get("concerns", []):
        keywords.update(CONCERN_ACTIVES.get(concern, []))

    def score(p: dict) -> float:
        actives = [a.lower() for a in p.get("actives", [])]
        name = p.get("name", "").lower()
        match_count = sum(1 for kw in keywords if any(kw in a for a in actives) or kw in name)
        return match_count * 10 + p.get("rating", 0)

    scored = sorted(all_products, key=score, reverse=True)[:limit]
    return {"items": scored, "total": len(scored), "page": 1, "total_pages": 1}


@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/services", response_model=List[Service])
async def get_services():
    svcs = await db.services.find({}, {"_id": 0}).to_list(100)
    return svcs if svcs else SERVICES_SEED


# ── Auth endpoints (OTP-based, passwordless) ──────────────────────────────────

@api_router.post("/auth/send-otp")
async def send_otp(payload: SendOtpInput):
    contact = payload.contact.strip()
    if not contact:
        raise HTTPException(status_code=400, detail="Contact (email or phone) is required")
    otp = str(random.randint(100000, 999999))
    OTP_STORE[contact] = {"otp": otp, "expires": datetime.now(timezone.utc) + timedelta(minutes=10)}
    # Production: send otp via email/SMS here. Dev: return in response.
    resp = {"message": "OTP sent successfully", "expires_in": 600}
    if DEV_MODE:
        resp["dev_otp"] = otp
    return resp

@api_router.post("/auth/verify-otp", response_model=TokenOut)
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

@api_router.get("/auth/me", response_model=UserOut)
async def get_me(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    return {"id": claims["sub"], "name": claims.get("name"), "contact": claims["contact"], "is_admin": is_admin_claims(claims)}

@api_router.patch("/auth/profile", response_model=UserOut)
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


# ── Lead capture ───────────────────────────────────────────────────────────────

@api_router.post("/leads", response_model=Lead)
async def create_lead(payload: LeadCreate):
    lead = Lead(**payload.model_dump())
    doc = lead.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leads.insert_one(doc)
    return lead


# ── Orders (UPI confirmation flow) ────────────────────────────────────────────

@api_router.post("/orders", response_model=Order)
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


@api_router.patch("/orders/{order_id}/confirm")
async def confirm_order(order_id: str, body: dict):
    upi_ref = body.get("upi_ref", "").strip().upper()
    if not upi_ref:
        raise HTTPException(status_code=400, detail="Transaction ID is required")

    # Guard against reuse — double-check even if /payments/verify was called
    if await db.transactions.find_one({"transaction_id": upi_ref}):
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

@api_router.get("/orders/mine")
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

@api_router.post("/payments/verify")
async def verify_payment(
    transaction_id: str    = Form(...),
    amount:         int    = Form(...),
    screenshot:     UploadFile = File(...),
):
    txn = transaction_id.strip().upper()
    if not txn or len(txn) < 6:
        raise HTTPException(status_code=400, detail="Transaction ID must be at least 6 characters")

    # 1. Uniqueness check — prevent screenshot reuse across orders
    if await db.transactions.find_one({"transaction_id": txn}):
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

    # 3. EXIF / metadata edit detection
    meta = await _check_image_metadata(image_bytes)
    if not meta.get("passed", True):
        return {
            "verified": False,
            "reason": meta.get("reason", "Screenshot appears to have been edited"),
            "checks": {"metadata": meta, "ai": None},
        }

    # 4. AI vision analysis
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

    # 5. Save pending verification so confirm endpoint can reference it
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

@api_router.get("/payments/upi-config")
async def upi_config():
    return UPI_CONFIG


# ── DB seed helper ────────────────────────────────────────────────────────────

@api_router.post("/admin/seed-db")
async def seed_db():
    """Insert seed data into MongoDB (idempotent — skips if already present)."""
    seeded = []
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([{**p} for p in PRODUCTS_SEED])
        seeded.append(f"{len(PRODUCTS_SEED)} products")
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([{**c} for c in CATEGORIES_SEED])
        seeded.append(f"{len(CATEGORIES_SEED)} categories")
    if await db.services.count_documents({}) == 0:
        await db.services.insert_many([{**s} for s in SERVICES_SEED])
        seeded.append(f"{len(SERVICES_SEED)} services")
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([{**c} for c in COUPON_SEEDS])
        seeded.append(f"{len(COUPON_SEEDS)} coupons")
    if seeded:
        return {"message": f"Seeded: {', '.join(seeded)}."}
    return {"message": "Already seeded. Skipped."}


# ── Admin endpoints ───────────────────────────────────────────────────────────

ORDER_STATUSES   = {"pending_payment", "payment_confirmed", "dispatched", "delivered", "cancelled"}
BOOKING_STATUSES = {"confirmed", "in_progress", "completed", "cancelled"}

@api_router.get("/admin/orders")
async def admin_all_orders(
    authorization: Optional[str] = Header(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    skip = (page - 1) * limit
    total = await db.orders.count_documents({})
    rows = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": rows, "total": total, "page": page, "total_pages": math.ceil(total / limit) or 1}

@api_router.patch("/admin/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    status = body.get("status", "")
    if status not in ORDER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {sorted(ORDER_STATUSES)}")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"id": order_id, "status": status}

@api_router.get("/admin/bookings")
async def admin_all_bookings(
    authorization: Optional[str] = Header(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    skip = (page - 1) * limit
    total = await db.bookings.count_documents({})
    rows = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": rows, "total": total, "page": page, "total_pages": math.ceil(total / limit) or 1}

@api_router.patch("/admin/bookings/{booking_id}/status")
async def admin_update_booking_status(
    booking_id: str,
    body: dict,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    status = body.get("status", "")
    if status not in BOOKING_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {sorted(BOOKING_STATUSES)}")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"id": booking_id, "status": status}


# ── Admin — Product CRUD ───────────────────────────────────────────────────────

@api_router.post("/admin/products")
async def admin_create_product(payload: ProductCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    product_id = f"p-{str(uuid.uuid4())[:8]}"
    doc = {"id": product_id, **payload.model_dump()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, payload: ProductUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        seed_product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
        if seed_product:
            await db.products.insert_one({**seed_product, **update})
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        await db.products.update_one({"id": product_id}, {"$set": update})
    return await db.products.find_one({"id": product_id}, {"_id": 0})

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    await db.products.delete_one({"id": product_id})
    await db.deleted_products.update_one(
        {"product_id": product_id},
        {"$set": {"product_id": product_id, "deleted_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"deleted": True, "id": product_id}

@api_router.patch("/admin/products/{product_id}/stock")
async def toggle_stock(product_id: str, body: dict, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    in_stock = body.get("in_stock", True)
    existing = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not existing:
        seed_product = next((p for p in PRODUCTS_SEED if p["id"] == product_id), None)
        if seed_product:
            await db.products.insert_one({**seed_product, "in_stock": in_stock})
        else:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        await db.products.update_one({"id": product_id}, {"$set": {"in_stock": in_stock}})
    return {"id": product_id, "in_stock": in_stock}


# ── Admin — Analytics ──────────────────────────────────────────────────────────

@api_router.get("/admin/analytics")
async def admin_analytics(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")

    paid = ["payment_confirmed", "dispatched", "delivered"]
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    rev_agg = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    total_revenue = rev_agg[0]["total"] if rev_agg else 0
    total_orders  = rev_agg[0]["count"] if rev_agg else 0

    week_agg = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}, "created_at": {"$gte": seven_days_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
    ]).to_list(1)
    revenue_this_week = week_agg[0]["total"] if week_agg else 0
    orders_this_week  = week_agg[0]["count"] if week_agg else 0

    top_products = await db.orders.aggregate([
        {"$match": {"status": {"$in": paid}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id":      "$items.id",
            "name":     {"$first": "$items.name"},
            "qty_sold": {"$sum":   "$items.qty"},
            "revenue":  {"$sum":   {"$multiply": ["$items.qty", "$items.price"]}},
        }},
        {"$sort": {"revenue": -1}},
        {"$limit": 5},
    ]).to_list(5)

    recent = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    total_customers = len(await db.orders.distinct("user_id"))

    return {
        "total_revenue":     total_revenue,
        "total_orders":      total_orders,
        "revenue_this_week": revenue_this_week,
        "orders_this_week":  orders_this_week,
        "total_customers":   total_customers,
        "top_products":      top_products,
        "recent_orders":     recent,
    }


# ── Admin — Tracking URL ───────────────────────────────────────────────────────

@api_router.patch("/admin/orders/{order_id}/tracking")
async def set_tracking(order_id: str, body: dict, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(status_code=403, detail="Admin access required")
    tracking_url = body.get("tracking_url", "")
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"tracking_url": tracking_url, "status": "dispatched"}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"id": order_id, "tracking_url": tracking_url}


# ── Notify-Me Waitlist ─────────────────────────────────────────────────────────

@api_router.post("/products/{product_id}/notify")
async def notify_when_back(product_id: str, payload: WaitlistCreate):
    doc = {
        "id":         str(uuid.uuid4()),
        "product_id": product_id,
        "contact":    payload.contact,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.waitlist.insert_one(doc)
    return {"success": True}


# ── Order detail ─────────────────────────────────────────────────────────────

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    order = await db.orders.find_one({"id": order_id, "user_id": claims["sub"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ── Reviews ───────────────────────────────────────────────────────────────────

@api_router.get("/products/{product_id}/reviews")
async def get_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    skip = (page - 1) * limit
    total = await db.reviews.count_documents({"product_id": product_id})
    rows = await db.reviews.find({"product_id": product_id}, {"_id": 0}) \
        .sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    avg = 0.0
    if rows:
        agg = await db.reviews.aggregate([
            {"$match": {"product_id": product_id}},
            {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
        ]).to_list(1)
        avg = round(agg[0]["avg"], 1) if agg else 0.0
    return {"items": rows, "total": total, "page": page,
            "total_pages": max(1, math.ceil(total / limit)), "avg_rating": avg}

@api_router.post("/products/{product_id}/reviews", response_model=Review)
async def create_review(
    product_id: str,
    payload: ReviewCreate,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1–5")
    if not payload.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    user_doc = await db.users.find_one({"id": claims["sub"]}, {"_id": 0})
    user_name = (user_doc or {}).get("name") or claims.get("contact", "Customer")
    existing = await db.reviews.find_one({"product_id": product_id, "user_id": claims["sub"]})
    if existing:
        raise HTTPException(status_code=409, detail="You have already reviewed this product")
    review = Review(
        product_id=product_id,
        user_id=claims["sub"],
        user_name=user_name,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    doc = review.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.reviews.insert_one(doc)
    return review


# ── Wishlist ──────────────────────────────────────────────────────────────────

@api_router.get("/wishlist")
async def get_wishlist(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    doc = await db.wishlists.find_one({"user_id": claims["sub"]}, {"_id": 0})
    return doc.get("products", []) if doc else []

@api_router.post("/wishlist/toggle/{product_id}")
async def toggle_wishlist(
    product_id: str,
    body: WishlistToggle,
    authorization: Optional[str] = Header(None),
):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    doc = await db.wishlists.find_one({"user_id": uid}, {"_id": 0})
    products = doc.get("products", []) if doc else []
    existing_ids = [p["id"] for p in products]
    if product_id in existing_ids:
        products = [p for p in products if p["id"] != product_id]
        added = False
    else:
        clean = {k: v for k, v in body.product.items() if k != "_id"}
        products.append(clean)
        added = True
    await db.wishlists.update_one(
        {"user_id": uid},
        {"$set": {"products": products, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"added": added, "count": len(products)}


# ── Address Book ──────────────────────────────────────────────────────────────

@api_router.get("/addresses", response_model=List[AddressOut])
async def list_addresses(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    rows = await db.addresses.find({"user_id": claims["sub"]}, {"_id": 0}).sort("created_at", 1).to_list(10)
    return rows

@api_router.post("/addresses", response_model=AddressOut)
async def create_address(payload: AddressCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    if payload.is_default:
        await db.addresses.update_many({"user_id": uid}, {"$set": {"is_default": False}})
    count = await db.addresses.count_documents({"user_id": uid})
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "is_default": payload.is_default or count == 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    }
    await db.addresses.insert_one(doc)
    return doc

@api_router.patch("/addresses/{addr_id}/default")
async def set_default_address(addr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    await db.addresses.update_many({"user_id": uid}, {"$set": {"is_default": False}})
    result = await db.addresses.update_one({"id": addr_id, "user_id": uid}, {"$set": {"is_default": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"id": addr_id, "is_default": True}

@api_router.delete("/addresses/{addr_id}")
async def delete_address(addr_id: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    result = await db.addresses.delete_one({"id": addr_id, "user_id": claims["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"deleted": True}


# ── Coupons ───────────────────────────────────────────────────────────────────

def _compute_discount(coupon: dict, total: int) -> int:
    if coupon["type"] == "flat":
        return min(coupon["value"], total)
    if coupon["type"] in ("percent", "first_order"):
        disc = int(total * coupon["value"] / 100)
        if coupon.get("max_discount"):
            disc = min(disc, coupon["max_discount"])
        return min(disc, total)
    return 0

def _coupon_label(coupon: dict) -> str:
    if coupon["type"] == "flat":
        return f"₹{coupon['value']} off"
    if coupon["type"] in ("percent", "first_order"):
        s = f"{coupon['value']}% off"
        if coupon.get("max_discount"):
            s += f" (max ₹{coupon['max_discount']})"
        return s
    return "Discount applied"

@api_router.post("/coupons/validate", response_model=CouponOut)
async def validate_coupon(payload: CouponValidateInput, authorization: Optional[str] = Header(None)):
    code = payload.code.strip().upper()
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found or expired")
    if payload.total < coupon.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order ₹{coupon['min_order']} required for this coupon")
    if coupon["type"] == "first_order" and authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            past = await db.orders.count_documents({"user_id": claims["sub"]})
            if past > 0:
                raise HTTPException(status_code=400, detail="This coupon is for first-time orders only")
        except HTTPException as exc:
            raise exc
        except Exception:
            pass
    disc = _compute_discount(coupon, payload.total)
    return CouponOut(
        code=code, type=coupon["type"], value=coupon["value"],
        min_order=coupon.get("min_order", 0), max_discount=coupon.get("max_discount"),
        discount=disc, final_total=max(0, payload.total - disc), label=_coupon_label(coupon),
    )

@api_router.get("/coupons/best")
async def best_coupon(total: int = Query(..., ge=1), authorization: Optional[str] = Header(None)):
    coupons = await db.coupons.find({"active": True, "min_order": {"$lte": total}}, {"_id": 0}).to_list(50)
    if not coupons:
        return None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            past = await db.orders.count_documents({"user_id": claims["sub"]})
            if past > 0:
                coupons = [c for c in coupons if c["type"] != "first_order"]
        except Exception:
            pass
    if not coupons:
        return None
    best = max(coupons, key=lambda c: _compute_discount(c, total))
    disc = _compute_discount(best, total)
    if disc == 0:
        return None
    return CouponOut(
        code=best["code"], type=best["type"], value=best["value"],
        min_order=best.get("min_order", 0), max_discount=best.get("max_discount"),
        discount=disc, final_total=max(0, total - disc), label=_coupon_label(best),
    )


# ── Skin Profile ──────────────────────────────────────────────────────────────

@api_router.get("/skin-profile")
async def get_skin_profile(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    doc = await db.skin_profiles.find_one({"user_id": claims["sub"]}, {"_id": 0})
    return doc

@api_router.post("/skin-profile", response_model=SkinProfileOut)
async def save_skin_profile(payload: SkinProfileCreate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    uid = claims["sub"]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    }
    await db.skin_profiles.update_one({"user_id": uid}, {"$set": doc}, upsert=True)
    return doc


# ── Chat / AI context (called by n8n WhatsApp router) ─────────────────────────

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    service_name: str
    service_price: int
    service_duration: str
    date: str
    time_slot: str
    address: dict
    notes: Optional[str] = None
    status: str = "confirmed"
    upi_ref: Optional[str] = None
    user_id: Optional[str] = None
    beautician_id: Optional[str] = None
    beautician_name: Optional[str] = None
    expansion_ring: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    service_id: str
    service_name: str
    service_price: int
    service_duration: str
    date: str
    time_slot: str
    address: dict
    notes: Optional[str] = None
    beautician_id: Optional[str] = None
    beautician_name: Optional[str] = None
    expansion_ring: Optional[int] = None

@api_router.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, authorization: Optional[str] = Header(None)):
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        try:
            claims = decode_token(authorization.split(" ", 1)[1])
            user_id = claims.get("sub")
        except Exception:
            pass
    booking = Booking(**payload.model_dump(), user_id=user_id)
    await db.bookings.insert_one(booking.model_dump())
    doc = await db.bookings.find_one({"id": booking.id}, {"_id": 0})
    return doc

@api_router.get("/bookings/mine")
async def my_bookings(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    user_id = claims["sub"]
    docs = await db.bookings.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


class ChatQueryInput(BaseModel):
    message: str
    phone: str
    context: Optional[dict] = None

class ChatSessionUpdate(BaseModel):
    phone: str
    business: str           # "ziyanisa" | "spices" | "unknown"
    context: Optional[dict] = None

@api_router.post("/chat/query")
async def chat_query(payload: ChatQueryInput):
    msg = payload.message.lower()
    results: dict = {"products": [], "services": [], "orders": [], "intent": "general", "business": "ziyanisa"}

    # Product context (up to 3 most relevant)
    p_query: dict = {"$or": [
        {"name":      {"$regex": msg, "$options": "i"}},
        {"brand":     {"$regex": msg, "$options": "i"}},
        {"category_id": {"$regex": msg.replace(" ", "-"), "$options": "i"}},
        {"actives":   {"$elemMatch": {"$regex": msg, "$options": "i"}}},
    ]}
    results["products"] = await db.products.find(p_query, {"_id": 0}).limit(3).to_list(3)

    # Service context (fall back to seed if DB empty)
    s_query: dict = {"$or": [
        {"name": {"$regex": msg, "$options": "i"}},
        {"tag":  {"$regex": msg, "$options": "i"}},
    ]}
    db_svcs = await db.services.find(s_query, {"_id": 0}).limit(3).to_list(3)
    if not db_svcs:
        db_svcs = [s for s in SERVICES_SEED if msg in s.get("name", "").lower() or msg in s.get("tag", "").lower()][:3]
    results["services"] = db_svcs

    # Order lookup by phone (last 10 digits)
    phone_digits = "".join(c for c in payload.phone if c.isdigit())[-10:]
    if phone_digits:
        user = await db.users.find_one({"phone": {"$regex": phone_digits}}, {"_id": 0})
        if user:
            results["orders"] = await db.orders.find(
                {"user_id": user["id"]}, {"_id": 0}
            ).sort("created_at", -1).limit(3).to_list(3)

    # Intent classification
    if any(w in msg for w in ["order", "track", "status", "delivery", "dispatch", "where is my"]):
        results["intent"] = "order_status"
    elif any(w in msg for w in ["book", "appointment", "facial", "salon", "service", "beautician", "massage"]):
        results["intent"] = "service_booking"
    elif any(w in msg for w in ["price", "cost", "rate", "how much", "charges"]):
        results["intent"] = "pricing"
    elif any(w in msg for w in ["return", "refund", "cancel", "complaint", "damaged", "wrong item"]):
        results["intent"] = "support"
    elif any(w in msg for w in ["skincare", "haircare", "makeup", "fragrance", "serum", "cream", "oil", "ittar"]):
        results["intent"] = "product_discovery"
    else:
        results["intent"] = "general"

    return results

@api_router.get("/chat/session/{phone}")
async def get_chat_session(phone: str):
    session = await db.chat_sessions.find_one({"phone": phone}, {"_id": 0})
    return session or {"phone": phone, "business": "unknown", "context": {}}

@api_router.post("/chat/session")
async def upsert_chat_session(payload: ChatSessionUpdate):
    doc = {
        "phone": payload.phone,
        "business": payload.business,
        "context": payload.context or {},
        "last_active": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_sessions.update_one({"phone": payload.phone}, {"$set": doc}, upsert=True)
    return doc


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

class AdminDutyUpdate(BaseModel):
    on_duty: bool


def _h3_cell(lat: float, lng: float) -> Optional[str]:
    if not _H3_OK:
        return None
    return _h3.geo_to_h3(lat, lng, H3_RES)


@api_router.get("/services/areas")
async def list_service_areas():
    return [{"name": k, "lat": v[0], "lng": v[1]} for k, v in HYD_AREA_COORDS.items()]


@api_router.post("/services/search")
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


@api_router.get("/admin/beauticians")
async def admin_list_beauticians(authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    docs = await db.beauticians.find({}, {"_id": 0}).sort("rating", -1).to_list(200)
    return docs


@api_router.post("/admin/beauticians")
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


@api_router.put("/admin/beauticians/{bid}")
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


@api_router.delete("/admin/beauticians/{bid}")
async def admin_delete_beautician(bid: str, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.beauticians.delete_one({"id": bid})
    return {"ok": True}


@api_router.get("/admin/service-bookings")
async def admin_list_service_bookings(page: int = Query(1, ge=1), authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    skip = (page - 1) * 25
    docs = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(25).to_list(25)
    total = await db.bookings.count_documents({})
    return {"items": docs, "total": total, "page": page, "total_pages": max(1, math.ceil(total / 25))}


@api_router.patch("/admin/service-bookings/{bid}/status")
async def admin_update_booking_status(bid: str, payload: BookingStatusUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": payload.status}})
    doc = await db.bookings.find_one({"id": bid}, {"_id": 0})
    return doc or {"id": bid, "status": payload.status}


@api_router.patch("/admin/beauticians/{bid}/duty")
async def admin_toggle_beautician_duty(bid: str, payload: AdminDutyUpdate, authorization: Optional[str] = Header(None)):
    claims = token_from_header(authorization)
    if not is_admin_claims(claims):
        raise HTTPException(403, "Admin only")
    await db.beauticians.update_one({"id": bid}, {"$set": {"on_duty": payload.on_duty}})
    return {"ok": True, "on_duty": payload.on_duty}


# ── Beautician self-service duty portal ──────────────────────────────────────

@api_router.get("/beauticians/profile")
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


@api_router.patch("/beauticians/duty")
async def toggle_beautician_duty(payload: DutyUpdate):
    """Beautician self-toggles duty status using their registered phone."""
    clean = "".join(c for c in payload.phone if c.isdigit())[-10:]
    result = await db.beauticians.update_one(
        {"$expr": {"$eq": [{"$substrCP": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}, clean]}},
        {"$set": {"on_duty": payload.on_duty}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "No beautician found with this phone number")
    doc = await db.beauticians.find_one(
        {"$expr": {"$eq": [{"$substrCP": ["$phone", {"$subtract": [{"$strLenCP": "$phone"}, 10]}, 10]}, clean]}},
        {"_id": 0},
    )
    return doc


@api_router.get("/beauticians/surge-zones")
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


# ── App setup ──────────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

@app.on_event("startup")
async def create_indexes():
    await db.products.create_index([("category_id", 1)])
    await db.products.create_index([("name", "text"), ("brand", "text"), ("actives", "text")])
    await db.products.create_index([("price", 1)])
    await db.orders.create_index([("user_id", 1)])
    await db.orders.create_index([("created_at", -1)])
    await db.users.create_index([("contact", 1)], unique=True, sparse=True)
    await db.users.create_index([("phone", 1)], sparse=True)
    await db.chat_sessions.create_index([("phone", 1)], unique=True)
    await db.reviews.create_index([("product_id", 1), ("user_id", 1)], unique=True)
    await db.wishlists.create_index([("user_id", 1)], unique=True)
    await db.addresses.create_index([("user_id", 1)])
    await db.skin_profiles.create_index([("user_id", 1)], unique=True)
    await db.coupons.create_index([("code", 1)], unique=True)
    await db.waitlist.create_index([("product_id", 1)])
    await db.products.create_index([("id", 1)], unique=True, sparse=True)
    await db.transactions.create_index([("transaction_id", 1)], unique=True)
    await db.payment_verifications.create_index([("transaction_id", 1)], unique=True)
    # Seed coupons if missing
    if await db.coupons.count_documents({}) == 0:
        await db.coupons.insert_many([{**c} for c in COUPON_SEEDS])
    # Auto-expire idle chat sessions after 7 days
    await db.chat_sessions.create_index([("last_active", 1)], expireAfterSeconds=604800)
    await db.bookings.create_index([("user_id", 1)])
    await db.bookings.create_index([("created_at", -1)])
    await db.bookings.create_index([("date", 1)])
    await db.bookings.create_index([("beautician_id", 1)])
    await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
    await db.reviews.create_index([("product_id", 1), ("user_id", 1)], unique=True)
    await db.wishlists.create_index([("user_id", 1)], unique=True)
    # Beauticians
    await db.beauticians.create_index([("h3_index", 1)])
    await db.beauticians.create_index([("area", 1)])
    await db.beauticians.create_index([("active", 1)])
    await db.beauticians.create_index([("on_duty", 1)])
    await db.beauticians.create_index([("phone", 1)])
    if await db.beauticians.count_documents({}) == 0:
        seeded_b = []
        for b in BEAUTICIANS_SEED:
            seeded_b.append({**b, "h3_index": _h3_cell(b["lat"], b["lng"]), "created_at": datetime.now(timezone.utc).isoformat()})
        await db.beauticians.insert_many(seeded_b)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
