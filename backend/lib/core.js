// ============================================================================
// Core HubSpot data logic — framework-agnostic. Used by server.js (and any
// serverless adapter). Raw https, no SDK, mirroring the existing card functions.
// ============================================================================

const https = require('https');
const {
  PALLET_TYPE, BRAND_META, HARVESTERS,
  LOCATION_BY_VALUE, FARMER_BY_VALUE, harvesterProp, slabsFor,
} = require('./config');

const HARVESTER_PROPS = ['ct_harvester', 'sa_harvester', 'jt_harvester', 'av_harvester'];

const PALLET_PROPS = [
  'order_name', 'turf_variety', 'area_m2', 'weight', 'pallet_type',
  'harvesting_status', 'brand', 'harvest_date', 'location',
  'harvester_farmer', 'harvester_farmer_phone',
  ...HARVESTER_PROPS,
];

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function hsRequest(method, path, body) {
  const token = process.env.PRIVATE_APP_TOKEN;
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.hubapi.com', path, method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      res => {
        let b = '';
        res.on('data', c => (b += c));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(b ? JSON.parse(b) : {});
          } else {
            reject(new Error(`${method} ${path} → ${res.statusCode}: ${b}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Date: "today" in Australia/Brisbane (UTC+10, no DST) ─────────────────────

const BNE_OFFSET_MS = 10 * 3600 * 1000;

// harvest_date is a HubSpot date property → stored/searched as epoch ms at UTC midnight
function todayBrisbaneUtcMs(now = Date.now()) {
  const d = new Date(now + BNE_OFFSET_MS);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// ── Read: today's pallets for a brand + harvester ────────────────────────────

async function getPallets({ brand, harvester, dateMs }) {
  if (!brand || !BRAND_META[brand]) throw new Error(`Unknown brand: ${brand}`);
  if (!harvester || !HARVESTERS.includes(harvester)) throw new Error(`Unknown harvester: ${harvester}`);

  const day = dateMs != null ? Number(dateMs) : todayBrisbaneUtcMs();
  const hProp = harvesterProp(brand);

  const filters = [
    { propertyName: 'harvest_date', operator: 'EQ', value: String(day) },
    { propertyName: hProp, operator: 'EQ', value: harvester },
  ];

  const results = [];
  let after;
  do {
    const body = {
      filterGroups: [{ filters }],
      properties: PALLET_PROPS,
      limit: 100,
      sorts: [{ propertyName: 'order_name', direction: 'ASCENDING' }],
    };
    if (after) body.after = after;
    const resp = await hsRequest('POST', `/crm/v3/objects/${PALLET_TYPE}/search`, body);
    (resp.results || []).forEach(r => results.push(r));
    after = resp.paging && resp.paging.next && resp.paging.next.after;
  } while (after);

  // Stable, human order by pallet # (numeric-aware)
  const pallets = results.map(r => shapePallet(r.id, r.properties || {}, brand))
    .sort((a, b) => String(a.palletNo).localeCompare(String(b.palletNo), undefined, { numeric: true }));

  return {
    brand,
    brandName: BRAND_META[brand].name,
    color: BRAND_META[brand].color,
    harvester,
    dateMs: day,
    count: pallets.length,
    pallets,
  };
}

function shapePallet(id, p, brand) {
  const loc = LOCATION_BY_VALUE[p.location];
  const farmer = FARMER_BY_VALUE[p.harvester_farmer];
  const areaM2 = p.area_m2 ? Number(p.area_m2) : 0;
  return {
    id: String(id),
    palletNo: p.order_name || '',
    variety: p.turf_variety || '',
    palletType: p.pallet_type || '',
    location: loc ? loc.label : (p.location || ''),
    harvester: p[harvesterProp(brand)] || '',
    teamMember: farmer ? farmer.name : '',
    teamPhone: p.harvester_farmer_phone || (farmer ? farmer.phone : ''),
    areaM2,
    slabSize: BRAND_META[brand].slab,
    slabs: slabsFor(brand, areaM2),
    weight: p.weight ? Number(p.weight) : 0,
    status: p.harvesting_status || 'Not started',
  };
}

// ── Read a single pallet (after an update, to echo fresh state) ──────────────

async function getPallet(id, brand) {
  const r = await hsRequest(
    'GET',
    `/crm/v3/objects/${PALLET_TYPE}/${id}?properties=${PALLET_PROPS.join(',')}`
  );
  const props = r.properties || {};
  const b = brand || props.brand;
  return shapePallet(id, props, b);
}

// ── Write: update pallet properties (weight / status) ────────────────────────

async function updatePallet(id, properties) {
  await hsRequest('PATCH', `/crm/v3/objects/${PALLET_TYPE}/${id}`, { properties });
  return { ok: true };
}

// Submit weight → also marks Complete (mirrors pallet-weight-card behaviour)
async function submitWeight(id, weight, brand) {
  const w = String(weight).trim();
  if (w === '' || isNaN(Number(w)) || Number(w) < 0) {
    throw new Error('Invalid weight');
  }
  await updatePallet(id, { weight: w, harvesting_status: 'Complete' });
  return getPallet(id, brand);
}

// Commence harvesting → status only
async function commenceHarvesting(id, brand) {
  await updatePallet(id, { harvesting_status: 'Harvest started' });
  return getPallet(id, brand);
}

module.exports = {
  getPallets, getPallet, submitWeight, commenceHarvesting,
  todayBrisbaneUtcMs,
};
