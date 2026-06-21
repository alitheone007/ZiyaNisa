-- =====================================================================
-- ZiyaNisa — Postgres-style SQL schema REFERENCE (read-only doc).
--
-- This file is a reference DDL for your LOCAL SQL testing. The running
-- backend uses MongoDB (via MONGO_URL) — but document shapes mirror the
-- tables below so you can:
--   1) replicate the data model in your local Postgres / MySQL instance
--   2) keep both DBs in sync as the app evolves
--
-- NOTHING in this file is executed by FastAPI. It is purely documentation.
--
-- Coverage matches the full marketplace scope from the brief:
--   users · profiles · brands · vendors · categories · category_attributes
--   products · product_variants · product_images · inventory
--   carts · cart_items · wishlists · wishlist_items
--   orders · order_items · payments · coupons · reviews
--   service_categories · services · service_addons
--   beauticians · beautician_skills · beautician_availability
--   service_bookings · booking_addons · booking_payments
--   locations · service_zones · commissions · admin_approvals
--
-- PENDING(next-AI): wire these to MongoDB collections one-by-one as each
-- module is implemented (Phase 2+).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- Roles & Identity --------------------------------------------
CREATE TYPE user_role AS ENUM ('customer', 'beautician', 'vendor', 'admin', 'super_admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE,
  phone           TEXT UNIQUE,
  password_hash   TEXT,                       -- bcrypt; nullable for OTP-only
  role            user_role NOT NULL DEFAULT 'customer',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name       TEXT,
  avatar_url      TEXT,
  gender          TEXT,
  dob             DATE,
  skin_type       TEXT,                       -- oily | dry | sensitive | combination | normal
  hair_type       TEXT,
  preferred_lang  TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Locations ----------------------------------------------------
CREATE TABLE locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT,                       -- "Home", "Office"
  line1           TEXT,
  line2           TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_zones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city            TEXT NOT NULL,
  name            TEXT,
  polygon_geojson JSONB,                      -- service-area polygon
  is_active       BOOLEAN DEFAULT TRUE
);

-- ---------- Brands & Vendors --------------------------------------------
CREATE TABLE brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT UNIQUE NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  story           TEXT,
  is_featured     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  legal_name      TEXT,
  brand_id        UUID REFERENCES brands(id),
  gst             TEXT,
  contact_person  TEXT,
  contact_phone   TEXT,
  warehouse_addr  JSONB,
  commission_pct  NUMERIC(5,2) DEFAULT 20.00,
  approval        approval_status DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Catalog ------------------------------------------------------
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id       UUID REFERENCES categories(id),
  slug            TEXT UNIQUE NOT NULL,
  label           TEXT NOT NULL,
  image_url       TEXT,
  sort_order      INT DEFAULT 0
);

CREATE TABLE category_attributes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  key             TEXT,                       -- "skin_type" | "skin_concern" | "ingredient" | ...
  value           TEXT                        -- "oily", "niacinamide", etc.
);

CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID REFERENCES vendors(id),
  brand_id        UUID REFERENCES brands(id),
  category_id     UUID REFERENCES categories(id),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  ingredients     TEXT,
  how_to_use      TEXT,
  safety_notes    TEXT,
  mrp             NUMERIC(10,2) NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  badges          TEXT[],                     -- "K-Glow", "Clean Pick", ...
  actives         TEXT[],                     -- "Niacinamide", "Ceramide", ...
  rating_avg      NUMERIC(3,2) DEFAULT 0,
  rating_count    INT DEFAULT 0,
  is_published    BOOLEAN DEFAULT FALSE,
  approval        approval_status DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  sku             TEXT UNIQUE,
  size_label      TEXT,
  shade_label     TEXT,
  price_override  NUMERIC(10,2),
  mrp_override    NUMERIC(10,2)
);

CREATE TABLE product_images (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt             TEXT,
  sort_order      INT DEFAULT 0
);

CREATE TABLE inventory (
  variant_id      UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  qty             INT NOT NULL DEFAULT 0,
  reserved        INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Cart, Wishlist, Orders --------------------------------------
CREATE TABLE carts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id         UUID REFERENCES carts(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id),
  qty             INT NOT NULL DEFAULT 1,
  added_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wishlists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE wishlist_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id     UUID REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id)
);

CREATE TYPE order_status AS ENUM ('placed','confirmed','packed','shipped','delivered','cancelled','returned');

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  location_id     UUID REFERENCES locations(id),
  subtotal        NUMERIC(10,2),
  discount        NUMERIC(10,2) DEFAULT 0,
  shipping        NUMERIC(10,2) DEFAULT 0,
  tax             NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2),
  status          order_status DEFAULT 'placed',
  coupon_code     TEXT,
  placed_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id),
  qty             INT NOT NULL,
  unit_price      NUMERIC(10,2) NOT NULL,
  line_total      NUMERIC(10,2) NOT NULL
);

CREATE TYPE payment_status AS ENUM ('pending','authorized','captured','failed','refunded');
CREATE TYPE payment_provider AS ENUM ('razorpay','paytm','cod','upi','wallet');

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider        payment_provider NOT NULL,
  provider_ref    TEXT,                       -- razorpay_payment_id / paytm txn id
  amount          NUMERIC(10,2),
  currency        TEXT DEFAULT 'INR',
  status          payment_status DEFAULT 'pending',
  webhook_payload JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     TEXT,
  discount_type   TEXT,                       -- "flat" | "percent"
  discount_value  NUMERIC(10,2),
  min_subtotal    NUMERIC(10,2) DEFAULT 0,
  max_discount    NUMERIC(10,2),
  valid_from      TIMESTAMPTZ,
  valid_to        TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  product_id      UUID REFERENCES products(id),
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  body            TEXT,
  is_verified_buy BOOLEAN DEFAULT FALSE,
  approval        approval_status DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Services & Bookings -----------------------------------------
CREATE TABLE service_categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE,
  label           TEXT NOT NULL,
  image_url       TEXT
);

CREATE TABLE services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id     UUID REFERENCES service_categories(id),
  slug            TEXT UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  duration_min    INT NOT NULL,
  base_price      NUMERIC(10,2) NOT NULL,
  level_required  TEXT,                       -- Trained | Senior | Bridal Expert
  inclusions      TEXT[],
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT TRUE
);

CREATE TABLE service_addons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id      UUID REFERENCES services(id) ON DELETE CASCADE,
  label           TEXT,
  price           NUMERIC(10,2),
  duration_min    INT DEFAULT 0
);

CREATE TABLE beauticians (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name    TEXT,
  photo_url       TEXT,
  experience_yrs  INT,
  languages       TEXT[],                     -- {"Telugu","Hindi","Urdu","English"}
  level           TEXT,                       -- Trained | Senior | Bridal Expert
  service_radius_km NUMERIC(5,2),
  hygiene_badge   BOOLEAN DEFAULT FALSE,
  training_badge  BOOLEAN DEFAULT FALSE,
  kit_verified    BOOLEAN DEFAULT FALSE,
  rating_avg      NUMERIC(3,2) DEFAULT 0,
  completed_count INT DEFAULT 0,
  approval        approval_status DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE beautician_skills (
  beautician_id   UUID REFERENCES beauticians(id) ON DELETE CASCADE,
  service_id      UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (beautician_id, service_id)
);

CREATE TABLE beautician_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beautician_id   UUID REFERENCES beauticians(id) ON DELETE CASCADE,
  weekday         INT,                        -- 0=Sun … 6=Sat
  start_time      TIME,
  end_time        TIME,
  zone_id         UUID REFERENCES service_zones(id)
);

CREATE TYPE booking_status AS ENUM ('requested','confirmed','en_route','started','completed','cancelled','no_show');

CREATE TABLE service_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id),
  service_id      UUID REFERENCES services(id),
  beautician_id   UUID REFERENCES beauticians(id),
  location_id     UUID REFERENCES locations(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  est_duration    INT,
  subtotal        NUMERIC(10,2),
  discount        NUMERIC(10,2) DEFAULT 0,
  total           NUMERIC(10,2),
  status          booking_status DEFAULT 'requested',
  start_otp       TEXT,
  end_otp         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE booking_addons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
  addon_id        UUID REFERENCES service_addons(id),
  qty             INT DEFAULT 1,
  price_snapshot  NUMERIC(10,2)
);

CREATE TABLE booking_payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
  provider        payment_provider NOT NULL,
  provider_ref    TEXT,
  amount          NUMERIC(10,2),
  status          payment_status DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Commission & Admin -----------------------------------------
CREATE TABLE commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id       UUID REFERENCES vendors(id),
  beautician_id   UUID REFERENCES beauticians(id),
  scope           TEXT,                       -- "product" | "service"
  percent         NUMERIC(5,2),
  effective_from  TIMESTAMPTZ DEFAULT NOW(),
  effective_to    TIMESTAMPTZ
);

CREATE TABLE admin_approvals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type     TEXT,                       -- "vendor" | "beautician" | "product" | "review"
  entity_id       UUID,
  reviewer_id     UUID REFERENCES users(id),
  status          approval_status DEFAULT 'pending',
  notes           TEXT,
  decided_at      TIMESTAMPTZ
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL,
  source          TEXT,                       -- "ittar_waitlist" | "newsletter"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- Helpful indexes --------------------------------------------
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_published ON products(is_published);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_bookings_user ON service_bookings(user_id);
CREATE INDEX idx_bookings_beautician ON service_bookings(beautician_id);
CREATE INDEX idx_locations_user ON locations(user_id);
