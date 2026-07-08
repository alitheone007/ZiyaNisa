"""Pydantic models."""

from datetime import datetime
from datetime import timezone
from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field
from typing import List
from typing import Optional
import uuid
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

class ServiceCreate(BaseModel):
    name: str
    duration: str = "60 min"
    price: int
    img: str
    level: str = "Trained"
    tag: str = ""
    rating: float = 4.5

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[int] = None
    img: Optional[str] = None
    level: Optional[str] = None
    tag: Optional[str] = None
    rating: Optional[float] = None

class CategoryCreate(BaseModel):
    id: str
    label: str
    img: str

class CategoryUpdate(BaseModel):
    label: Optional[str] = None
    img: Optional[str] = None

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


