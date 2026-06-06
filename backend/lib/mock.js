// ============================================================================
// In-memory mock of core.js — for local UI testing without a HubSpot token.
// Enable with MOCK=1. State resets on restart.
// ============================================================================

const { BRAND_META, HARVESTERS, slabsFor } = require('./config');

// A small fixture queue keyed by brand+harvester.
const FIXTURES = {
  'CT|HV2': [
    { id: '101', palletNo: 'HV-1042', variety: 'TifTuf Hybrid Bermuda', palletType: 'Standard', location: 'Lateral 9', teamMember: 'Mia Coleman', teamPhone: '0412 100 202', areaM2: 70, weight: 0, status: 'Not started' },
    { id: '102', palletNo: 'HV-1043', variety: 'TifTuf Hybrid Bermuda', palletType: 'Standard', location: 'Lateral 9', teamMember: 'Mia Coleman', teamPhone: '0412 100 202', areaM2: 70, weight: 0, status: 'Not started' },
    { id: '103', palletNo: 'HV-1044', variety: 'Sir Walter DNA Certified Buffalo', palletType: 'Half', location: 'Pivot 4', teamMember: 'Mia Coleman', teamPhone: '0412 100 202', areaM2: 35, weight: 700, status: 'Complete' },
    { id: '104', palletNo: 'HV-1045', variety: 'Empire Zoysia', palletType: 'Standard', location: 'Pivot 5', teamMember: 'Mia Coleman', teamPhone: '0412 100 202', areaM2: 65, weight: 0, status: 'Not started' },
  ],
};

const store = JSON.parse(JSON.stringify(FIXTURES));

function decorate(brand, p) {
  return {
    ...p,
    harvester: 'HV2',
    slabSize: BRAND_META[brand].slab,
    slabs: slabsFor(brand, p.areaM2),
  };
}

async function getPallets({ brand, harvester }) {
  if (!BRAND_META[brand]) throw new Error(`Unknown brand: ${brand}`);
  if (!HARVESTERS.includes(harvester)) throw new Error(`Unknown harvester: ${harvester}`);
  const list = (store[`${brand}|${harvester}`] || []).map(p => decorate(brand, p));
  return {
    brand, brandName: BRAND_META[brand].name, color: BRAND_META[brand].color,
    harvester, dateMs: 0, count: list.length, pallets: list,
  };
}

function findById(id) {
  for (const key of Object.keys(store)) {
    const hit = store[key].find(p => p.id === String(id));
    if (hit) return { p: hit, brand: key.split('|')[0] };
  }
  return null;
}

async function submitWeight(id, weight) {
  const w = String(weight).trim();
  if (w === '' || isNaN(Number(w)) || Number(w) < 0) throw new Error('Invalid weight');
  const hit = findById(id);
  if (!hit) throw new Error('Pallet not found');
  hit.p.weight = Number(w);
  hit.p.status = 'Complete';
  return decorate(hit.brand, hit.p);
}

async function commenceHarvesting(id) {
  const hit = findById(id);
  if (!hit) throw new Error('Pallet not found');
  hit.p.status = 'Harvest started';
  return decorate(hit.brand, hit.p);
}

async function getPallet(id) {
  const hit = findById(id);
  if (!hit) throw new Error('Pallet not found');
  return decorate(hit.brand, hit.p);
}

module.exports = { getPallets, getPallet, submitWeight, commenceHarvesting };
