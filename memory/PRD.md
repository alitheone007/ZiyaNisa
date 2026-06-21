# ZiyaNisa — Product Requirements Document (PRD)

## Original Problem Statement
Build a premium full-stack ecommerce + beauty service marketplace web application
called **ZiyaNisa**. A modern Indian beauty, wellness, fragrance, jewellery, and
women's lifestyle marketplace inspired by Korean skincare science, Arabic/Hyderabadi
elegance, clean beauty, organic ingredients, safe synthetic actives, and at-home
beautician services. Visual palette: **K-Glow Gold**. Tagline: "K-Glow Beauty,
Deccan Grace, Delivered to You."

(Full brief preserved in initial conversation.)

## User Choices (locked-in for this build)
- **Phase 1 first**: One-page visual preview homepage (this build) — full MVP later
- **Auth**: JWT email/password (mock OTP placeholders)
- **DB**: MongoDB (current stack) + Postgres-style SQL reference at
  `/app/backend/sql_schema_reference.sql` for local SQL testing
- **Payments**: Module placeholders ready — env vars + `/api/payments/providers`
  endpoint for **Razorpay** and **Paytm** (no provider integrated yet)
- **Images**: Curated Unsplash/Pexels placeholders — to be replaced by cloud-hosted
  brand assets in production

## User Personas
1. **Guest visitor** — discovers brand & offerings on the homepage
2. **Customer** — shops products, books at-home salon services, tracks orders
3. **Beautician** — gets bookings, manages availability, earns weekly payouts
4. **Brand / Vendor** — lists products, manages inventory & sales
5. **Admin / Super Admin** — moderates approvals, manages catalog & ops

## Core Requirements (static — brand-level)
- K-Glow Gold palette strictly enforced (no gold body text on light backgrounds)
- Premium, calm motion (Framer Motion) — respects `prefers-reduced-motion`
- Mobile-first responsive design with bottom nav + floating cart
- Cross-selling between product catalog and at-home services
- Original brand voice — no Nykaa/UC/YesMadam/Amazon copy or imagery
- 25 routes planned (see "Backlog")

## What's been implemented (2026-02 / Phase 1)
- ✅ Visual preview homepage (`/`) with **11 editorial sections**:
  - Animated header with logo, search, location dropdown, wishlist/cart/account
  - Hero with 6 floating product/service/jewellery/ittar cards + animated halos + shimmer ribbon
  - Trust badges row (Verified Brands, Trained Beauticians, Clean Ingredients, etc.)
  - 10-category grid with hover lift + arrow-out icons
  - K-Glow product teaser (8 products) — hover lift, ingredient capsule reveals, quick-action overlay, gold shimmer border, discount badges
  - Korean Glow editorial section with floating active-ingredient capsules
  - At-home Salon service teaser (8 services) with skill-level chips & "Book at Home" CTAs
  - Beautician onboarding card (dark espresso panel + 3 perk pills)
  - Ittar & Fragrance teaser with waitlist input
  - Jewellery & Handbags teaser (4 items)
  - Footer (4 nav columns, newsletter, social, brand story)
  - Mobile bottom nav (5 tabs) + floating cart FAB
- ✅ Backend API (`/api/`, `/api/health`, `/api/seed/{categories|products|services}`, `/api/leads`, `/api/payments/providers`)
- ✅ Lead-capture persistence to MongoDB (`leads` collection)
- ✅ Payment module **placeholder** with Razorpay + Paytm env-var contracts
- ✅ Postgres-style SQL DDL reference for all 25+ tables (read-only doc)
- ✅ K-Glow Gold theme tokens in `tailwind.config.js` + `index.css`
- ✅ `data-testid` attributes on every interactive element
- ✅ Fixed pre-existing webpack-dev-server v5 schema incompatibility in `craco.config.js`

## File Map (Phase 1)
- `frontend/src/pages/Home.jsx`
- `frontend/src/components/site/{Header,Hero,TrustBadges,CategoryGrid,ProductTeaser,KoreanGlow,ServiceTeaser,BeauticianOnboard,IttarTeaser,JewelleryTeaser,Footer,MobileBottomNav}.jsx`
- `frontend/src/data/seed.js` (mock data — search "PENDING" / "TODO(next-AI)")
- `backend/server.py` (seed endpoints + payment provider status)
- `backend/sql_schema_reference.sql` (reference DDL)

## Prioritized Backlog (Phase 2+)

### P0 — Make it shoppable
- Product listing page `/shop`, `/shop/:category` with filters (skin type, concern, actives, brand, price), sort, drawer on mobile, skeleton loaders
- Product detail `/product/:slug` (gallery, tabs, recommended combos, service pairing)
- Cart `/cart` + Checkout `/checkout` (mock payment; provider stub ready)
- Wishlist `/wishlist`
- Auth: signup / login / JWT — **call `integration_playbook_expert_v2` first**

### P1 — Service marketplace
- Service listing & detail pages, booking flow (location → date/time → beautician matching → confirmation), OTP-start/end placeholders
- Beautician profile `/beautician/:id`
- Customer account: orders, bookings, addresses

### P2 — Multi-sided platform
- Beautician onboarding + dashboard (availability, today's bookings, earnings)
- Vendor onboarding + dashboard (products, inventory, sales)
- Admin dashboard (approvals queue, metrics, RBAC)

### P3 — Premium expansion
- Ittar & Fragrance full storefront (currently waitlist only)
- Jewellery & Handbags full storefront (currently 4-item teaser)
- Clean Beauty Journal `/journal`
- Razorpay & Paytm full integration (env vars + endpoint stubs already in place)
- Real image upload via object storage
- Reviews + moderation
- Coupons + promo engine
- SEO metadata + schema.org markup on product/service pages

## Next Tasks
1. User reviews visual preview screenshots → approves direction or requests tweaks
2. On approval, scope **P0 sprint**: product listing + detail + cart + auth
3. Before any auth code → invoke `integration_playbook_expert_v2` for JWT playbook
