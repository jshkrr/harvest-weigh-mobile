// GET /api/manifest?brand=CT  → per-brand PWA web app manifest
const { buildManifest } = require('../lib/manifest');

module.exports = (req, res) => {
  const q = req.query || {};
  const manifest = buildManifest(q.brand, q.key);
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.statusCode = 200;
  res.end(JSON.stringify(manifest));
};
