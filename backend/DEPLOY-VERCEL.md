# Deploy to Vercel (prototype — page + API on one URL)

For the prototype, one Vercel deployment serves **both** the mobile page and the
API at the default `*.vercel.app` URL. No custom domain, no HubSpot page, no CORS
(same origin). Each brand is just a query param.

```
https://<your-app>.vercel.app/?brand=CT     ← Coolabah
                              ?brand=SA     ← StrathAyr
                              ?brand=JT     ← Jimboomba
                              ?brand=AV     ← Allenview
```

## What serves what
- `public/index.html` + `public/app.css` + `public/app.js` → the page (static).
- `api/pallets/...` → the API (serverless functions).
- `app.css`/`app.js` are **copied** from the canonical module in
  `hubspot-module/harvest-weigh.module/` by `npm run sync-frontend`.

## Steps

1. **Sync the front-end** (do this whenever you change module.css/module.js):
   ```bash
   cd backend
   npm run sync-frontend
   ```
2. **Install the CLI** (once): `npm i -g vercel`
3. **Deploy:**
   ```bash
   vercel            # first run links/creates the project + preview deploy
   ```
4. **Set environment variables** (Project ▸ Settings ▸ Environment Variables):

   **Option A — demo with fake data (safest first step):**
   ```
   MOCK = 1
   ```
   Serves the built-in fixtures. No token, no writes to real HubSpot. Great for
   sharing the link and clicking through the flow on a phone.

   **Option B — live data:**
   ```
   PRIVATE_APP_TOKEN = pat-na1-...        (crm.objects.custom read + write)
   API_KEY           = <long random>      (recommended — see below)
   ```
   Leave `ALLOWED_ORIGINS` unset/`*` for the prototype (same-origin anyway).
   Remove `MOCK`.

5. **Ship:** `vercel --prod` → gives the `*.vercel.app` URL.

## API key on the prototype
Because the page and API share an origin, if you set `API_KEY` the page must send
it. The page reads it from the URL, so share links as:
```
https://<your-app>.vercel.app/?brand=CT&key=<your API_KEY>
```
For a quick prototype you can skip `API_KEY` entirely (the `.vercel.app` URL is
unguessable) — but anything that can write to **real** HubSpot data should use it,
or stay on `MOCK=1` until you're ready.

## Test
```bash
# page
open "https://<your-app>.vercel.app/?brand=CT"
# api
curl "https://<your-app>.vercel.app/api/pallets?brand=CT&harvester=HV2"
```

## Test locally first (mirrors prod exactly)
```bash
npm run sync-frontend
MOCK=1 node server.js              # page + API on http://localhost:3000
# open http://localhost:3000/?brand=CT
```

## Moving to your real domain later
When the subdomain is ready you have two clean paths — either keep the page on
Vercel and add a custom domain, or switch to the **HubSpot module** (already
built in `hubspot-module/`) pointing its Backend URL at this same API. Both
reuse this exact backend. See `../SETUP.md`.
