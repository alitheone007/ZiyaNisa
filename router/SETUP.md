# Bilion AI Router — Setup Guide

## Architecture

```
WhatsApp (Single Number — Meta Business API)
          │
          ▼
Meta Webhook → n8n: Gateway Workflow (whatsapp_gateway)
          │
          ▼ POST /route
Bilion AI Router  (FastAPI, port 8001)
          │
     ┌────┴─────────────────────┐
     │                          │
  Keyword/AI classify       Admin commands
     │                       (your number only)
     ▼                          ▼
Tenant Registry (MongoDB)    /status /tenants
     │                       /switch /session
     ├── ziyanisa → AI mode
     │       └→ ZiyaNisa FastAPI /chat/query → Claude "Nisa"
     │
     └── spices → passthrough mode
             └→ existing spice n8n workflow (unchanged)
          │
          ▼
Meta Graph API → Reply to customer
```

---

## Step 1 — Deploy the Router

The router runs as a Docker container alongside the ZiyaNisa backend.

```bash
# From your ZiyaNisa project root:
docker compose up -d router
```

Verify it's running:
```bash
curl http://localhost:8001/health
# → {"status":"ok","service":"bilion-ai-router"}
```

View seeded tenants:
```bash
curl http://localhost:8001/tenants
```

---

## Step 2 — Set environment variables

Add to your `.env` (copy `.env.example` first):

```env
ANTHROPIC_API_KEY=sk-ant-xxxx
ADMIN_PHONE=919XXXXXXXXX        # your number, no +, e.g. 918341372666
SESSION_TTL_HOURS=24
```

Restart the router after setting:
```bash
docker compose restart router
```

---

## Step 3 — Wire spice passthrough URL

The spices tenant uses passthrough mode. Set its `passthrough_url` to your existing spice n8n webhook URL.

In n8n (automation.bilionsales.com), open the spice workflow → get its webhook URL.
Then call the Router API to update:

```bash
curl -X PUT http://localhost:8001/tenants/spices \
  -H "Content-Type: application/json" \
  -d '{"passthrough_url": "https://automation.bilionsales.com/webhook/whatsapp_catalog"}'
```

Or via the router's built-in Swagger UI: `http://localhost:8001/docs`

---

## Step 4 — Import the Gateway n8n workflow

1. Open n8n (automation.bilionsales.com)
2. Click **+** → **Import from file**
3. Select `n8n/gateway-workflow.json`
4. The workflow webhook path is `whatsapp_gateway`

**Set n8n environment variables** (Settings → Variables):

| Variable | Value |
|---|---|
| `BILION_ROUTER_URL` | `http://router:8001` (Docker internal) |

The workflow reuses your existing `Header Auth account` credential (id: `atbyjLJl0owsnm0w`) for Meta API calls.

**Activate the workflow** → copy webhook URL:
`https://automation.bilionsales.com/webhook/whatsapp_gateway`

---

## Step 5 — Point Meta webhook to Gateway

In Meta Developer Console → Your WhatsApp App → Configuration → Webhook:

- **Callback URL**: `https://automation.bilionsales.com/webhook/whatsapp_gateway`
- **Verify Token**: `bilion_gateway_2026`
- **Subscribed fields**: `messages`

This replaces the previous direct webhook to your spice workflow. The gateway now receives all messages and routes them — spice messages are forwarded to the spice workflow via passthrough.

---

## Step 6 — Test routing

Send messages from your phone to the WhatsApp number:

```
"I need biryani masala"          → routes to spices → spice workflow handles it
"Show me vitamin C serum"        → routes to ziyanisa → Nisa replies
"book a facial"                  → routes to ziyanisa → Nisa replies
/switch ziyanisa                 → switch session to ZiyaNisa
/brand                           → shows current brand + options
```

Admin commands (only from your ADMIN_PHONE):
```
/status                          → all tenant health
/tenants                         → list active brands
/session 919876543210            → check what brand a customer is in
/clear 919876543210              → reset a customer's session
```

---

## Step 7 — Add a new brand

Register a new brand via the Router API:

```bash
curl -X POST http://localhost:8001/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "realtyflow",
    "name": "RealtyFlow Pro",
    "description": "Real estate platform for Hyderabad property listings and rentals",
    "keywords": ["flat", "apartment", "property", "rent", "buy", "2bhk", "3bhk", "hyderabad", "plot"],
    "api_url": "http://realtyflow-api:8000/api",
    "mode": "ai",
    "persona": "Ria",
    "system_prompt": "You are Ria, a friendly real estate assistant for RealtyFlow Pro. Help customers find properties in Hyderabad. Keep responses under 120 words. Sign off as — *Ria, RealtyFlow Pro* 🏠"
  }'
```

That's it. No changes to existing workflows, no new WhatsApp numbers.

---

## How sessions work

| Scenario | Behavior |
|---|---|
| New user, first message | AI classifies brand from keywords/intent |
| Returning user (< 24h) | Stays in same brand session |
| User sends `/switch spices` | Force-switches to spice brand |
| User sends `/brand` | Shows current brand + all options |
| Session expires (24h) | Re-classified on next message |
| Admin sends `/clear {phone}` | Resets that user's session |

---

## Multi-tenant data isolation

Each brand's data lives in its own Docker container and database.
The AI Router only knows:
- Which brand to route to
- The brand's `/chat/query` API endpoint (for context)
- The brand's persona/system prompt

Customers of ZiyaNisa never see spice data. Spice customers never see ZiyaNisa data.

---

## Scaling: 50 brands

```bash
# Register brand #50 — 30 seconds of work
curl -X POST http://router:8001/tenants -d '{
  "slug": "brand50",
  "name": "Brand Fifty",
  "api_url": "http://brand50-api:8000/api",
  "keywords": [...],
  "system_prompt": "..."
}'
```

No n8n changes. No new webhook. No new WhatsApp number. Just register and go.
