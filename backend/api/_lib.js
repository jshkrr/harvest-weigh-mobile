// Shared helpers for the Vercel serverless functions (CORS + API key + core resolver).
// Set MOCK=1 in the env to use fixtures instead of live HubSpot (handy for a
// preview deployment). Production leaves MOCK unset.

const core = process.env.MOCK === '1' ? require('../lib/mock') : require('../lib/core');

const ALLOWED = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  let allow = '*';
  if (!ALLOWED.includes('*')) allow = ALLOWED.includes(origin) ? origin : (ALLOWED[0] || '');
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key');
  res.setHeader('Vary', 'Origin');
}

function keyOk(req) {
  const API_KEY = process.env.API_KEY || '';
  if (!API_KEY) return true;
  const k = req.headers['x-api-key'] || (req.query && req.query.key);
  return k === API_KEY;
}

module.exports = { core, applyCors, keyOk };
