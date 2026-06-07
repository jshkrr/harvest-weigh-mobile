// Builds a per-brand PWA manifest object. Shared by the Vercel function
// (api/manifest.js) and the standalone server (server.js).

const { BRAND_META } = require('./config');

function buildManifest(code, key) {
  const c = (BRAND_META[String(code || '').toUpperCase()] ? String(code).toUpperCase() : 'CT');
  const b = BRAND_META[c];
  const lc = c.toLowerCase();
  const keyQs = key ? `&key=${encodeURIComponent(key)}` : '';
  return {
    name: `Harvest Weigh — ${b.name}`,
    short_name: b.short || b.name,
    description: `Enter pallet weights for ${b.name} harvest.`,
    start_url: `/?brand=${c}${keyQs}`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f6f8',
    theme_color: b.color,
    icons: [
      { src: `/icons/${lc}-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: `/icons/${lc}-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}

module.exports = { buildManifest };
