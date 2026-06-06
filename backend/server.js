// ============================================================================
// Harvest Weigh backend — standalone, zero-dependency Node HTTP server.
//
//   GET  /health                          → { ok: true }
//   GET  /api/pallets?brand=CT&harvester=HV2[&dateMs=...]
//   POST /api/pallets/:id/weight          body { weight }
//   POST /api/pallets/:id/commence
//
// Run locally:   node server.js            (reads .env)
// Mock data:     MOCK=1 node server.js      (no HubSpot calls — for UI testing)
//
// Deploy: any Node 18+ host (VPS, Render, Railway, Fly). For Vercel/Cloudflare,
// wrap lib/core.js in that platform's handler — see README.
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Minimal .env loader (no dependency) ──────────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
})();

const MOCK = process.env.MOCK === '1';
const core = MOCK ? require('./lib/mock') : require('./lib/core');
const { BRAND_META, HARVESTERS } = require('./lib/config');

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.API_KEY || '';
const ALLOWED = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  let allow = '*';
  if (!ALLOWED.includes('*')) {
    allow = ALLOWED.includes(origin) ? origin : ALLOWED[0] || '';
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Vary': 'Origin',
  };
}

function send(res, status, body, origin) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    ...corsHeaders(origin),
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

function keyOk(req, url) {
  if (!API_KEY) return true;
  const k = req.headers['x-api-key'] || url.searchParams.get('key');
  return k === API_KEY;
}

const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function serveStatic(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  // prevent path traversal
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(filePath));
  return true;
}

// ── Router ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    return res.end();
  }

  if (url.pathname === '/health') {
    return send(res, 200, { ok: true, mock: MOCK }, origin);
  }

  // Lightweight metadata for the front-end (brand names/colours, harvester list)
  if (url.pathname === '/api/meta') {
    return send(res, 200, { brands: BRAND_META, harvesters: HARVESTERS }, origin);
  }

  if (!keyOk(req, url)) {
    return send(res, 401, { error: 'Unauthorized' }, origin);
  }

  try {
    // GET /api/pallets
    if (req.method === 'GET' && url.pathname === '/api/pallets') {
      const brand = url.searchParams.get('brand');
      const harvester = url.searchParams.get('harvester');
      const dateMs = url.searchParams.get('dateMs');
      const data = await core.getPallets({ brand, harvester, dateMs });
      return send(res, 200, data, origin);
    }

    // POST /api/pallets/:id/weight  and  /commence
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'pallets' && parts[2]) {
      const id = parts[2];
      const action = parts[3];
      const brand = url.searchParams.get('brand') || null;

      if (action === 'weight') {
        const body = await readBody(req);
        const pallet = await core.submitWeight(id, body.weight, brand);
        return send(res, 200, { ok: true, pallet }, origin);
      }
      if (action === 'commence') {
        const pallet = await core.commenceHarvesting(id, brand);
        return send(res, 200, { ok: true, pallet }, origin);
      }
    }

    // Static files from public/ (mirrors how Vercel serves them in prod, so the
    // same-origin page can be tested locally). API routes above take precedence.
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      if (serveStatic(res, url.pathname)) return;
    }

    return send(res, 404, { error: 'Not found' }, origin);
  } catch (err) {
    console.error(err.message);
    return send(res, 500, { error: err.message }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`Harvest Weigh backend on :${PORT}${MOCK ? ' (MOCK mode)' : ''}`);
});
