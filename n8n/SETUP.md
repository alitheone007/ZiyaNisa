# ZiyaNisa — WhatsApp Setup (Meta Business API)

## Architecture

Your spice business already uses Meta WhatsApp Business API via automation.bilionsales.com.
ZiyaNisa runs as a **second, isolated workflow** on the same n8n instance, using a **separate phone number** added to the same Meta WABA (or a new WABA).

Customers texting the ZiyaNisa number see only ZiyaNisa. The spice business is invisible to them.

```
Customer ──► ZiyaNisa WhatsApp Number
                  │
                  ▼ (Meta webhook → automation.bilionsales.com/n8n)
          n8n: ZiyaNisa Workflow
                  │ filter by phone_number_id  ← keeps spice flow separate
                  │
          /api/chat/query (ZiyaNisa FastAPI)
                  │
          Claude AI "Nisa" persona
                  │
          ◄── Reply via Meta Graph API
```

---

## Step 1 — Add a second WhatsApp number to your Meta WABA

Your existing number (834xxxxxxx) is registered to Meta WABA for the spice business.
**Do NOT use the same number for ZiyaNisa** — customers would see both businesses.

Options (cheapest first):

### Option A — Second number on existing WABA (fastest)
1. Go to [Meta Business Suite](https://business.facebook.com) → Settings → WhatsApp Accounts
2. Click your WABA → "Add Phone Number"
3. Use any SIM-free virtual number: [2ndLine](https://www.2ndline.co), [Google Voice](https://voice.google.com), or a cheap Indian VoIP (JustCall, Exotel, Knowlarity)
4. Verify via OTP
5. Copy the new number's **Phone Number ID** from the API setup page

### Option B — Separate Meta App (full isolation)
1. Create a new Meta App at [developers.facebook.com](https://developers.facebook.com)
2. Add WhatsApp product
3. Register a new number
4. Point webhook to a new n8n webhook URL

**Option A is recommended** — same server, same credentials, just different phone_number_id.

---

## Step 2 — Get the ZIYANISA_PHONE_NUMBER_ID

After adding the number:
1. Meta Developer Console → Your App → WhatsApp → API Setup
2. Under "Step 1: Select phone numbers" — select the ZiyaNisa number
3. Copy the **Phone Number ID** (looks like: `123456789012345`)
4. This is your `ZIYANISA_PHONE_NUMBER_ID`

---

## Step 3 — Configure n8n environment variables

In n8n UI (automation.bilionsales.com):
Go to **Settings → Variables → Add**:

| Variable | Value |
|---|---|
| `ZIYANISA_PHONE_NUMBER_ID` | from Step 2 (e.g. `123456789012345`) |
| `ZIYANISA_API_URL` | `http://ziyanisa-backend:8000/api` (Docker internal) OR `https://yourdomain.com/api` |
| `ANTHROPIC_API_KEY` | your Anthropic key for Claude AI |

The `Header Auth account` credential already exists in your n8n (used by spice bot with id `atbyjLJl0owsnm0w`). The ZiyaNisa workflow reuses it — same Meta Bearer token since it's the same WABA.

---

## Step 4 — Import the ZiyaNisa n8n workflow

1. Open n8n: `https://automation.bilionsales.com` (or port 5678)
2. Click **"+"** → **"Import from file"**
3. Select `n8n/ziyanisa-whatsapp-workflow.json`
4. The workflow appears with webhook path: `whatsapp_ziyanisa`
5. **Activate** the workflow → copy the webhook URL:
   `https://automation.bilionsales.com/webhook/whatsapp_ziyanisa`

---

## Step 5 — Add ZiyaNisa webhook to Meta

### If using same WABA as spice (Option A):
Meta only supports ONE webhook URL per WABA. The existing spice webhook receives ALL messages.

**Solution**: Modify the existing spice workflow to forward ZiyaNisa messages:

Add a filter node at the very start of the spice workflow:
```
phone_number_id == SPICE_PHONE_ID → continue spice flow
phone_number_id == ZIYANISA_PHONE_ID → HTTP Request to ZiyaNisa webhook URL
```

This way the spice workflow acts as a dispatcher, and ZiyaNisa workflow handles its own messages. The ZiyaNisa customer sees NOTHING from the spice flow.

### If using separate Meta App (Option B):
- In the new Meta App → WhatsApp → Configuration → Webhook
- Callback URL: `https://automation.bilionsales.com/webhook/whatsapp_ziyanisa`
- Verify Token: `ziyanisa_webhook_2026`
- Subscribe to: `messages`

---

## Step 6 — Check clawbot (alternative to Anthropic API)

Clawbot is installed on the Hetzner server. SSH in to discover it:

```bash
ssh root@95.216.150.181

# Find it
docker ps | grep -i claw
systemctl status clawbot 2>/dev/null
ss -tlnp | grep LISTEN

# Test common ports
curl http://localhost:3001/
curl http://localhost:3001/health
curl http://localhost:3002/
```

**If clawbot exposes a `/chat/completions` endpoint** (OpenAI-compatible):
- In the "Claude AI (Nisa)" node, change URL to: `http://localhost:CLAWBOT_PORT/chat/completions`
- Change model to whatever clawbot serves
- Remove Anthropic headers, add clawbot auth if needed

**If clawbot IS the Claude Code CLI** (for coding tasks only):
- Use Anthropic API directly (default setup) — set `ANTHROPIC_API_KEY` in n8n variables

---

## Step 7 — Update the WhatsApp button in the app

Once you have the ZiyaNisa number:

In `.env` (frontend build):
```
REACT_APP_WA_NUMBER=91XXXXXXXXXX   # ZiyaNisa number digits only (no +)
```

Or directly in [frontend/src/components/site/WhatsAppFloat.jsx](../frontend/src/components/site/WhatsAppFloat.jsx):
```js
const WA_NUMBER = "91XXXXXXXXXX";
```

---

## How the isolation works

The ZiyaNisa workflow has a **"Is ZiyaNisa Number?"** filter node that checks:
```
phone_number_id == ZIYANISA_PHONE_NUMBER_ID
```

If the message is NOT for the ZiyaNisa number → silently dropped. The spice workflow handles it. ZiyaNisa customers never see any spice-related content. The AI persona is "Nisa" and only knows about ZiyaNisa products/services.

---

## Customer experience

New customer texts the ZiyaNisa number:
```
Customer: Hi
Nisa: Hi Priya! ✨ Welcome to ZiyaNisa! I'm Nisa, your beauty advisor. How can I help today?
      [🛍️ Shop Products] [💆 Book Service] [📦 Track Order]

Customer: What serums do you have?
Nisa: We have some lovely serums! ✨ Our Vitamin C Glow Serum (₹749) is bestselling for brightening.
      Also the Hyaluronic Acid Hydration Serum (₹649) for deep moisture. 
      Browse all: https://ziyanisa.com/shop — Nisa, ZiyaNisa 💜
```

---

## Multi-business expansion (future)

When you add Business #3 (e.g. clothing, accessories):
1. Add a third phone number to WABA
2. Duplicate this workflow file, rename it
3. Change `ZIYANISA_PHONE_NUMBER_ID` → `NEWBIZ_PHONE_NUMBER_ID`
4. Update the AI system prompt with the new business context
5. Point to the new business backend API

Zero changes needed to existing ZiyaNisa or spice workflows.

---

## Costs

| Item | Cost |
|---|---|
| Meta WhatsApp API messages (India) | ~₹0.40 per conversation (24h window) |
| 2ndLine / virtual SIM for second number | ~$3/month |
| Claude Haiku API | ~$0.25 per million tokens (~4000 messages) |
| n8n (already running on Hetzner) | Free |
| ZiyaNisa backend (already on Hetzner) | Free |

**Estimated: ~$5–10/month for first 500 conversations.**
