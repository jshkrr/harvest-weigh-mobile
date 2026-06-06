# Harvest Weigh — mobile page

A phone-friendly web page harvest operators open in a browser to enter pallet
weights — replacing the `pallet-weight-card` UI extension, which the HubSpot
mobile app can't show (custom objects don't render there).

It mirrors the pallet-weight card and adds: brand logo + date header, harvester
picker, and per-pallet detail (harvester, team member, location, variety, pallet
type, area m², slab count) with left/right navigation through today's queue.

```
harvest-weigh-mobile/
├── backend/                         External API (holds the private-app token)
│   ├── server.js                    Zero-dependency Node HTTP server
│   ├── lib/core.js                  HubSpot read/write (raw https)
│   ├── lib/config.js                Locations, farmers, brand meta, slab sizes
│   ├── lib/mock.js                  In-memory fixtures (MOCK=1, no token needed)
│   └── .env.example
├── hubspot-module/
│   └── harvest-weigh.module/        Custom module to drop on a HubSpot page
│       ├── module.html  module.css  module.js
│       └── fields.json  meta.json
├── preview/index.html               Local preview (reuses the real module files)
└── SETUP.md                         Step-by-step deploy + page-build guide
```

## How it fits together

```
 Operator's phone ──▶ HubSpot CMS page (one per brand)
                         └─ harvest-weigh module  (front-end, no secrets)
                              │  fetch()
                              ▼
                      Backend you host  ── PRIVATE_APP_TOKEN ──▶ HubSpot CRM API
                                                                  (Pallet 2-63402401)
```

- **One URL per brand.** Build 4 pages (Coolabah / StrathAyr / Jimboomba /
  Allenview), each with the module set to that brand + its logo. The operator
  opens their farm's link and taps which harvester (HV1/HV2/HV3) they're in.
- **Queue = today's pallets** (Brisbane date) for the chosen harvester, ordered
  by pallet #. Submitting a weight marks the pallet `Complete` and jumps to the
  next un-weighed pallet. Arrows step through manually.
- **Slabs = m² ÷ slab size** (CT 0.5, SA 0.5, JT 0.76, AV 0.76).

## Prototype: page + API on one Vercel URL

For now (no custom domain yet) the whole thing runs as a **single Vercel
deployment** that serves both the page and the API. Each brand is a query param:
`https://<app>.vercel.app/?brand=CT|SA|JT|AV`. Deploy steps:
**[backend/DEPLOY-VERCEL.md](backend/DEPLOY-VERCEL.md)**. The HubSpot module in
`hubspot-module/` is kept for when you move it onto your own domain later.

## Quick local preview (no HubSpot, no token)

Same-origin (mirrors the Vercel prototype exactly):
```bash
cd backend && npm run sync-frontend && MOCK=1 node server.js
# open http://localhost:3000/?brand=CT
```

Flip farms with `?brand=CT|SA|JT|AV`. (`preview/index.html` is an alternative
two-process preview that points at the backend cross-origin.)

## Important note on test data

`backend/lib/config.js` carries the **same made-up locations & farmers** the
`harvest-order-card` uses (it's not live yet). The page resolves the `location`
slug and `harvester_farmer` to display names from this map — so when the real
location/farmer values land in the harvest-order card, copy them into
`config.js` here too, or those two fields will show the raw slug. Everything else
(variety, area, pallet type, weight, status, harvester) comes straight from the
pallet record and needs no config.
