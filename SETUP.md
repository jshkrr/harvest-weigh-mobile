# Setup — deploy the backend, then build the HubSpot pages

There are two pieces: a small **backend** you host (it holds the HubSpot token),
and a **HubSpot module** you place on one page per brand. Do the backend first
so you have its URL when configuring the pages.

---

## 1. Backend

### 1a. Get a private-app token
Reuse the token the `pallet-weight-card` / `harvest-order-card` functions already
use, or create a HubSpot **private app** with scopes:
`crm.objects.custom.read` and `crm.objects.custom.write`.

### 1b. Configure
```bash
cd backend
cp .env.example .env
# edit .env:
#   PRIVATE_APP_TOKEN=pat-na1-...      (required)
#   API_KEY=some-long-random-string    (recommended — see note below)
#   ALLOWED_ORIGINS=https://www.coolabahturf.com.au,https://...   (your CMS domain)
```

### 1c. Run it
**Any Node 18+ host** (a VPS, Render, Railway, Fly.io):
```bash
node server.js          # listens on $PORT (default 3000)
```
Put it behind HTTPS (the HubSpot page is HTTPS, so the backend must be too —
browsers block mixed content). A reverse proxy (Caddy/nginx) or the host's
built-in TLS handles this.

**Vercel:** ready to go — the `api/` folder + `vercel.json` are already wired.
See **[DEPLOY-VERCEL.md](backend/DEPLOY-VERCEL.md)** for the full steps
(`vercel`, set env vars, `vercel --prod`, custom domain). The logic lives in the
shared `lib/core.js`, so the Vercel functions and `server.js` behave identically.

**Netlify / Cloudflare:** same `lib/core.js` core — ask me and I'll generate that
platform's adapter.

### 1d. Verify
```bash
curl "https://YOUR-BACKEND/api/pallets?brand=CT&harvester=HV2&key=YOUR_API_KEY"
```
Should return today's CT/HV2 pallets as JSON.

> **Security note.** This endpoint can write weights, so set `API_KEY`. The page
> sends it as `?key=`, which is fine for an internal tool but not a true secret
> (it's visible in the page). For stronger control, restrict `ALLOWED_ORIGINS`
> to your CMS domain and/or put the backend behind HubSpot membership later.

---

## 2. HubSpot module

### 2a. Upload the module
With the HubSpot CLI (the same `hs` you use for the card projects):
```bash
cd hubspot-module
hs upload harvest-weigh.module "harvest-weigh.module"
```
…or in the Design Manager: **File ▸ Upload** the `harvest-weigh.module` folder.
It appears under custom modules as **Harvest Weigh**.

### 2b. Build one page per brand
For each farm:
1. **Marketing ▸ Website ▸ Website Pages ▸ Create** (a blank/one-column theme is
   ideal — the module is self-contained and full-bleed).
2. Drag the **Harvest Weigh** module onto the page.
3. In the module settings set:
   - **Brand / farm** → Coolabah / StrathAyr / Jimboomba / Allenview
   - **Backend URL** → `https://YOUR-BACKEND` (no trailing slash)
   - **API key** → the same value as the backend's `API_KEY`
   - **Brand logo** → upload that farm's logo (optional; falls back to a wordmark)
4. **Publish.** Give the URL a memorable slug, e.g. `/harvest/coolabah`.
5. Repeat for the other three brands.

Operators bookmark their farm's page. On open they see the logo + today's date,
tap their harvester, and step through the queue.

### 2c. Mobile polish (optional)
- The page sets `viewport-fit=cover` and respects the iOS safe area, so it sits
  nicely behind the home indicator.
- Tell operators to **Add to Home Screen** — it then opens chrome-free, like an
  app.

---

## Field mapping (for reference)

| On screen      | Pallet property (`2-63402401`)                    |
|----------------|---------------------------------------------------|
| Pallet #       | `order_name`                                      |
| Harvester      | `{brand}_harvester` (HV1/HV2/HV3)                 |
| Team member    | `harvester_farmer` → name, `harvester_farmer_phone` |
| Location       | `location` → resolved via `config.js`             |
| Variety        | `turf_variety`                                     |
| Pallet type    | `pallet_type`                                      |
| Area m²        | `area_m2`                                          |
| Slabs          | `area_m2 ÷ slab size` (computed)                   |
| Weight         | `weight`                                           |
| Status         | `harvesting_status` (Not started/Harvest started/Complete) |

Submit writes `weight` + `harvesting_status: 'Complete'`. "Commence Harvesting"
writes `harvesting_status: 'Harvest started'` — identical to the existing card.
