# ZiyaNisa — Architecture & Developer Reference

**Premium Indian beauty, wellness, fragrance, jewellery & at-home salon marketplace.**  
Tagline: *K-Glow Beauty, Deccan Grace, Delivered to You.*

Live: https://ziyanisa.bilionsales.com  
Server: Hetzner VPS — 95.216.150.181

---

## Stack at a glance

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7, React Query v5, Tailwind CSS, shadcn/ui, Craco |
| Backend | FastAPI (Python 3.11+), Motor (async MongoDB driver) |
| Database | MongoDB 7 |
| Proxy / CDN | nginx (Docker, serves React SPA + proxies `/api/`) |
| Image storage | Docker named volume `uploads_data`, served at `/api/uploads/` |
| Auth | JWT (30-day), OTP via phone (2factor.in) or email (SMTP) |
| CI/CD | GitHub Actions → GHCR → SSH → `docker compose up -d` |
| WhatsApp AI | Bilion AI Router (FastAPI, port 8001) + n8n gateway workflow |

---

## Repository structure

```
ZiyaNisa/
├── frontend/               React SPA
│   ├── src/
│   │   ├── App.js          Route definitions (React Router v7)
│   │   ├── context/        AuthContext, CartContext, CompareContext, WishlistContext
│   │   ├── pages/          One file per route (see Routes below)
│   │   ├── components/
│   │   │   ├── site/       Domain components (Header, Hero, WhatsAppFloat …)
│   │   │   └── ui/         shadcn/ui primitives
│   │   └── lib/api.js      Axios instance pointing at /api
│   ├── tailwind.config.js  K-Glow Gold design tokens
│   └── craco.config.js     Webpack overrides + @/ path alias
│
├── backend/
│   ├── server.py           All FastAPI routes + startup
│   ├── otp_sender.py       Phone OTP (2factor.in) + email OTP (SMTP)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example        Canonical env-var reference
│
├── router/                 Bilion AI Router (multi-tenant WhatsApp)
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── n8n/
│   ├── gateway-workflow.json       n8n: receives all WA messages → routes via Router
│   ├── ziyanisa-whatsapp-workflow.json   n8n: ZiyaNisa AI "Nisa" persona
│   └── SETUP.md            Full WhatsApp + n8n wiring guide
│
├── nginx/
│   └── default.conf        nginx routing config (baked into proxy image at build)
│
├── Dockerfile.proxy        Multi-stage: React build → nginx image
├── docker-compose.yml      All services: proxy, backend, mongodb, router, n8n
├── .github/workflows/
│   ├── deploy.yml          CI/CD: build → push GHCR → SSH deploy
│   └── rollback.yml        Roll back to previous image tag
└── design_guidelines.json  K-Glow palette, typography, spacing, component tokens
```

---

## Docker services

```
docker compose up -d
```

| Service | Container | Port (internal) | Purpose |
|---|---|---|---|
| proxy | ziyanisa-proxy | 80 | nginx: serves React SPA + proxies `/api/` |
| backend | ziyanisa-backend | 8000 | FastAPI API |
| mongodb | ziyanisa-mongodb | 27017 | MongoDB 7 |
| router | bilion-router | 8001 | Multi-tenant WhatsApp AI router |
| n8n | ziyanisa-n8n | 5678 | Workflow engine (opt-in: `--profile n8n`) |

**Volumes:**

| Volume | Purpose |
|---|---|
| `mongo_data` | MongoDB data — persists across restarts |
| `uploads_data` | Product images — mounted at `/app/uploads` in backend, served at `/api/uploads/` |
| `n8n_data` | n8n workflow state |

---

## nginx routing (`nginx/default.conf`)

```
/api/        →  http://backend:8000/api/   (^~ prefix, bypasses static-asset regex)
/            →  /usr/share/nginx/html      (React SPA, try_files → index.html)
*.js/*.css   →  1-year cache from /usr/share/nginx/html
```

The `^~` on `/api/` is critical — prevents nginx's `*.jpg/*.png` static-asset regex from intercepting `/api/uploads/image.jpg`.

---

## Frontend routes

| Path | Page | Notes |
|---|---|---|
| `/` | Home | Editorial landing page |
| `/shop` | Shop | Product listing with filters |
| `/product/:slug` | ProductDetail | PDP with gallery, tabs |
| `/services` | Services | Service listing |
| `/book/:slug` | Book | Service booking flow |
| `/cart` | Cart | |
| `/checkout` | Checkout | |
| `/wishlist` | Wishlist | |
| `/compare` | Compare | Side-by-side product compare |
| `/search` | Search | |
| `/account` | Account | Order history, profile |
| `/login` | Login | OTP auth (phone or email) |
| `/skin-quiz` | SkinQuiz | Personalization quiz |
| `/admin` | Admin | Admin panel (admin only) |
| `/beautician/apply` | BeauticianApply | 4-step beautician onboarding |
| `/beautician/portal` | BeauticianPortal | Portal — looks up bookings by phone |
| `/duty` | (redirect target) | Beautician duty dashboard |

---

## Auth system

**OTP flow:**
1. `POST /api/auth/send-otp` — sends 6-digit OTP to phone (2factor.in) or email (SMTP)
2. `POST /api/auth/verify-otp` — verifies OTP, returns JWT

**JWT:**
- 30-day expiry
- Payload: `{ contact, role, name?, phone? }`
- `contact` is the phone or email used to log in
- Stored in `localStorage` as `zn_user` JSON: `{ token, contact, role, name, phone }`

**Roles:** `customer` | `beautician` | `vendor` | `admin`

Admin is identified by phone matching `ADMIN_PHONE` env var. Returns `role: "admin"` in JWT.

**AuthContext** (`frontend/src/context/AuthContext.jsx`):
- Loads `zn_user` from localStorage synchronously on mount (survives refresh)
- Exposes: `user`, `login(userData)`, `logout()`
- `user.contact` — the phone/email used for OTP (not `user.phone`)

---

## Backend API — endpoint groups

All routes prefixed `/api/`. Auth header: `Authorization: Bearer <jwt>`.

### Auth
| Method | Path | Auth |
|---|---|---|
| POST | `/auth/send-otp` | Public |
| POST | `/auth/verify-otp` | Public |

### Products
| Method | Path | Auth |
|---|---|---|
| GET | `/products` | Public |
| GET | `/products/:id` | Public |
| POST | `/admin/products` | Admin |
| PUT | `/admin/products/:id` | Admin |
| DELETE | `/admin/products/:id` | Admin |

### Services
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/services` | Public | Returns seed data if collection empty |
| POST | `/services/search` | Public | Keyword search |
| POST | `/admin/services` | Admin | Create service |
| PUT | `/admin/services/:id` | Admin | Update; materializes seed item if first edit |
| DELETE | `/admin/services/:id` | Admin | |

### Categories
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/categories` | Public | Returns seed data if collection empty |
| POST | `/admin/categories` | Admin | ID must be unique slug |
| PUT | `/admin/categories/:id` | Admin | Cannot change id after creation |
| DELETE | `/admin/categories/:id` | Admin | |

### Cart / Wishlist / Compare
| Method | Path | Auth |
|---|---|---|
| GET/POST/DELETE | `/cart`, `/cart/:id` | Customer |
| GET/POST/DELETE | `/wishlist`, `/wishlist/:id` | Customer |

### Bookings
| Method | Path | Auth |
|---|---|---|
| POST | `/bookings` | Customer |
| GET | `/bookings` | Admin |
| GET | `/bookings/my` | Customer |

### Beautician
| Method | Path | Auth |
|---|---|---|
| POST | `/beautician/apply` | Public |
| GET | `/beautician/profile` | Beautician |
| GET | `/beautician/status` | Public (by phone) |
| PUT | `/admin/beauticians/:id/approve` | Admin |
| PUT | `/admin/beauticians/:id/reject` | Admin |

### Orders
| Method | Path | Auth |
|---|---|---|
| POST | `/orders` | Customer |
| GET | `/orders/my` | Customer |
| GET | `/admin/orders` | Admin |
| PUT | `/admin/orders/:id/status` | Admin |

### Image upload
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/admin/upload-image` | Admin | Saves to `uploads_data` volume, returns `/api/uploads/{filename}` |
| GET | `/api/uploads/{filename}` | Public | Served by FastAPI StaticFiles |

### Bug reports / Feature requests
| Method | Path | Auth |
|---|---|---|
| POST | `/bug-reports` | Customer |
| GET | `/admin/bug-reports` | Admin |
| GET | `/admin/bug-reports/:id` | Admin |
| PUT | `/admin/bug-reports/:id/status` | Admin |
| POST | `/feature-requests` | Customer |
| GET | `/admin/feature-requests` | Admin |
| GET | `/admin/feature-requests/:id` | Admin |
| PUT | `/admin/feature-requests/:id/status` | Admin |

Bug reports with `create_github_issue: true` auto-create a GitHub Issue via `GITHUB_TOKEN`.

### Analytics
| Method | Path | Auth |
|---|---|---|
| GET | `/admin/analytics` | Admin |

### WhatsApp / AI chat
| Method | Path | Auth |
|---|---|---|
| POST | `/chat/query` | Internal (from n8n) |

---

## MongoDB collections

| Collection | Purpose |
|---|---|
| `users` | Registered users — phone/email, role, name, address |
| `profiles` | Beautician profiles — skills, portfolio, approval status |
| `applications` | Beautician applications — 4-step form data |
| `products` | Product catalog — name, category, price, images, stock |
| `services` | Service catalog — name, duration, price, skill level |
| `categories` | Product/service categories |
| `bookings` | Service bookings — customer, beautician, date/time, status |
| `orders` | Product orders — items, payment, delivery status |
| `cart` | Per-user cart items |
| `wishlist` | Per-user wishlist items |
| `bug_reports` | Bug reports with screenshots (base64) |
| `feature_requests` | Feature requests with screenshots (base64) |
| `leads` | Email/WhatsApp waitlist signups |
| `otp_store` | In-memory only (not persisted) |

---

## Admin panel (`/admin`)

Tabs:
1. **Analytics** — revenue, bookings, orders, users cards + 7-day charts
2. **Products** — full CRUD: image upload, name, brand, price/MRP, category, actives, badges, in-stock toggle
3. **Services** — full CRUD: image upload, name, duration, price, skill level (dropdown), tag
4. **Categories** — full CRUD: image upload, slug ID (create only), display label
5. **Orders** — list all orders, update status, set tracking URL (marks as Dispatched)
6. **Svc Bookings** — list service bookings, update status, edit address/notes
7. **Beauticians** — approve/reject beautician applications
8. **Applications** — view full application detail
9. **Bug Reports** — list, open detail, change status; screenshots; GitHub Issue auto-create
10. **Features** — feature request list and detail management

---

## Beautician flow

### Apply (`/beautician/apply`)
1. On mount: checks `user.contact` from `AuthContext`
2. If phone in session → calls `GET /api/beautician/profile` (approved → redirects to `/duty`)
3. If not approved → calls `GET /api/beautician/status` (pending → shows amber status screen; rejected → shows red screen with "Re-apply Now")
4. Otherwise → shows 4-step application form (phone pre-filled from session)

### Portal (`/beautician/portal`)
1. Shows phone lookup form by default
2. On mount: if `user.contact` is a phone number → auto-fills and triggers lookup (survives refresh via AuthContext)
3. Lookup calls `GET /api/beautician/profile?phone=XXXXXXXXXX`
4. Shows today's bookings, upcoming schedule, earnings

---

## Image upload

Product images upload to a named Docker volume, not an external service.

- **Admin UI**: Upload button in product form → `POST /api/admin/upload-image` (multipart, 10 MB cap)
- **Backend**: saves `{uuid}.{ext}` to `/app/uploads/` (mounted from `uploads_data` volume)
- **Served at**: `https://ziyanisa.bilionsales.com/api/uploads/{filename}` via FastAPI `StaticFiles`
- **Stored in DB**: relative URL `/api/uploads/{filename}` — works regardless of domain

---

## WhatsApp AI routing (Bilion AI Router)

Multi-tenant WhatsApp routing — one phone number, multiple brands.

```
Customer WhatsApp message
    → Meta Webhook → n8n: Gateway Workflow
    → POST /route → Bilion AI Router (port 8001)
    → classify brand (keyword AI)
    → ziyanisa tenant → POST /api/chat/query → Claude "Nisa"
                    OR
    → spices tenant → passthrough → spice n8n workflow
    → Meta Graph API → reply
```

See [`n8n/SETUP.md`](n8n/SETUP.md) for full Meta webhook + n8n wiring.  
See [`router/SETUP.md`](router/SETUP.md) for router API and adding new tenants.

---

## CI/CD

`.github/workflows/deploy.yml`:
1. Trigger: push to `main`
2. Build `proxy` and `backend` Docker images
3. Push to GHCR (`ghcr.io/alitheone007/ziyanisa/proxy:latest` etc.)
4. SSH into 95.216.150.181
5. Pull new images + `docker compose up -d --remove-orphans`
6. Write `.last_deployed_sha` on server

`.github/workflows/rollback.yml`: manual trigger, re-deploys previous SHA tag.

**Required GitHub secrets:**
- `HETZNER_SSH_KEY` — private key for server SSH
- `GHCR_TOKEN` — PAT with `packages:write` for GHCR push
- `HETZNER_HOST` — `95.216.150.181`
- `HETZNER_USER` — `root`

**Server layout:**
```
/opt/ziyanisa/
├── docker-compose.yml
├── backend/.env          ← real secrets, never committed
└── gdrive-sa.json        ← (legacy, no longer needed)
```

---

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URL` | `mongodb://mongodb:27017` (Docker internal) |
| `DB_NAME` | `ziyanisa` |
| `ENVIRONMENT` | `production` (disables dev OTP bypass) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `ADMIN_PHONE` | Comma-separated 10-digit phones → each gets `role: admin` JWT |
| `ADMIN_EMAIL` | Comma-separated emails → each gets `role: admin` JWT |
| `CORS_ORIGINS` | `https://ziyanisa.bilionsales.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Email OTP via Gmail/Brevo/Resend |
| `SMTP_FROM` | Sender address for OTP emails |
| `TWOFACTOR_API_KEY` | 2factor.in SMS OTP (India phone numbers) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment (placeholder, not integrated) |
| `ANTHROPIC_API_KEY` | Claude AI for WhatsApp "Nisa" persona |
| `OLLAMA_HOST` / `VISION_MODEL` | Vision model for payment screenshot analysis |
| `GITHUB_TOKEN` | PAT → auto-create GitHub Issues from bug reports |
| `GITHUB_REPO` | `alitheone007/ziyanisa` |

See [`backend/.env.example`](backend/.env.example) for the full annotated template.

---

## Design system

Source of truth: [`design_guidelines.json`](design_guidelines.json)

**Palette (K-Glow Gold):**
- Background: Porcelain Ivory `#FFF8EF`, Soft Rose Mist `#FDEDEA`, Pearl White `#FFFFFF`
- Text: Deep Espresso `#2B2118`, Muted Taupe `#8A7A6A`
- Accent: K-Glow Gold `#D8B45C`, Warm Champagne `#F4DFA4`
- Status: Aqua Teal `#7ED6D1`, Peach Blush `#F6B8A8`, Success `#4E9F7A`, Error `#C95C5C`

**Typography:** Playfair Display (headings) + Inter (body)

**Rules:**
- Never gold text on light backgrounds — use Deep Espresso `#2B2118` for body copy
- `gold_glow` shadow on all premium card/button hover states
- `-translate-y-2` hover lift on product/service cards
- `prefers-reduced-motion` respected

Tailwind tokens are in [`frontend/tailwind.config.js`](frontend/tailwind.config.js).

---

## Local development

```bash
# Terminal 1 — Backend
cd backend
pip install -r requirements.txt
cp .env.example .env        # fill in real values
uvicorn server:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
yarn install
yarn start                  # http://localhost:3000
```

Frontend dev server proxies `/api` → `http://localhost:8000` via `craco.config.js`.

For full Docker stack locally:
```bash
docker compose -f docker-compose.dev.yml up
```
