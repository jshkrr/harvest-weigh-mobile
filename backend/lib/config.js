// ============================================================================
// Shared harvest config — kept in step with harvest-order-card/harvestConfig.js.
// Locations (pivot/lateral) → variety + harvester, plus the farmers per brand,
// brand display meta (name, colour, slab size), and lookup helpers.
//
// NOTE: locations/farmers below are the SAME made-up test data the harvest-order
// card uses. When the card's real values land, copy them here too so the mobile
// page resolves location & team-member names identically.
// ============================================================================

const PALLET_TYPE = '2-63402401';

const BRANDS = ['CT', 'SA', 'JT', 'AV'];

// Brand display: name, primary colour (from generateChecklist BRAND_COLORS),
// and slab size in m² per slab (CT/SA = 0.5, JT/AV = 0.76 — confirmed by Josh).
const BRAND_META = {
  CT: { name: 'Coolabah Turf',  short: 'Coolabah',  color: '#1a4d2e', slab: 0.5  },
  SA: { name: 'StrathAyr',      short: 'StrathAyr', color: '#003366', slab: 0.5  },
  JT: { name: 'Jimboomba Turf', short: 'Jimboomba', color: '#2d5a1b', slab: 0.76 },
  AV: { name: 'Allenview Turf', short: 'Allenview', color: '#4a7c2f', slab: 0.76 },
};

// Harvester machines available per brand (drives the on-load picker).
const HARVESTERS = ['HV1', 'HV2', 'HV3'];

// 12 locations applied to every farm. [name, nickname|null, variety, harvester]
const LOCATION_TEMPLATE = [
  ['Pivot 1', null, 'Sir Walter DNA Certified Buffalo', 'HV1'],
  ['Pivot 2', null, 'TifTuf Hybrid Bermuda', 'HV1'],
  ['Pivot 3', null, 'Sir Grange Zoysia', 'HV1'],
  ['Lateral 1', null, 'Nullarbor Couch', 'HV1'],
  ['Lateral 2', 'The Flats', 'Eureka Premium Kikuyu VG', 'HV2'],
  ['Pivot 4', null, 'Sir Walter DNA Certified Buffalo', 'HV2'],
  ['Pivot 5', null, 'Empire Zoysia', 'HV2'],
  ['Lateral 9', null, 'TifTuf Hybrid Bermuda', 'HV2'],
  ['Lateral 10', 'Back Paddock', 'Wintergreen Couch', 'HV3'],
  ['Pivot 6', null, 'Zoysia Australis', 'HV3'],
  ['Pivot 7', null, 'Palmetto Buffalo', 'HV3'],
  ['Lateral 12', null, 'Stadium Sports Couch', 'HV3'],
];

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

const LOCATIONS = [];
for (const brand of BRANDS) {
  for (const [name, nickname, variety, harvester] of LOCATION_TEMPLATE) {
    LOCATIONS.push({
      value: `${brand.toLowerCase()}_${slug(name)}`,
      name,
      nickname,
      label: nickname ? `${name} (${nickname})` : name,
      brand, variety, harvester,
    });
  }
}

const FARMER_TEMPLATE = {
  CT: [['Jack Tucker','0412 100 201'],['Mia Coleman','0412 100 202'],['Sam Whitfield','0412 100 203'],['Olivia Barnes','0412 100 204'],['Ned Fraser','0412 100 205']],
  SA: [['Ruby Maxwell','0412 200 201'],['Tom Ashby','0412 200 202'],['Grace Holloway','0412 200 203'],['Lachlan Reid','0412 200 204'],['Ella Monroe','0412 200 205']],
  JT: [['Cooper Hayes','0412 300 201'],['Ivy Sutton','0412 300 202'],['Marcus Quinn','0412 300 203'],['Harper Lowe','0412 300 204'],['Eli Brennan','0412 300 205']],
  AV: [['Zoe Carver','0412 400 201'],['Hugo Pemberton','0412 400 202'],['Lily Forsythe','0412 400 203'],['Oscar Mead','0412 400 204'],['Ava Sinclair','0412 400 205']],
};

const FARMERS = [];
for (const brand of BRANDS) {
  for (const [name, phone] of FARMER_TEMPLATE[brand]) {
    FARMERS.push({ value: `${brand.toLowerCase()}_${slug(name)}`, name, phone, brand });
  }
}

const LOCATION_BY_VALUE = Object.fromEntries(LOCATIONS.map(l => [l.value, l]));
const FARMER_BY_VALUE = Object.fromEntries(FARMERS.map(f => [f.value, f]));

// brand → pallet harvester property name, e.g. 'CT' → 'ct_harvester'
function harvesterProp(brand) {
  return brand ? `${brand.toLowerCase()}_harvester` : null;
}

// m² → whole slab count for a brand
function slabsFor(brand, areaM2) {
  const slab = (BRAND_META[brand] && BRAND_META[brand].slab) || 0.5;
  const n = Number(areaM2);
  if (!n || !slab) return 0;
  return Math.round(n / slab);
}

module.exports = {
  PALLET_TYPE, BRANDS, BRAND_META, HARVESTERS,
  LOCATIONS, FARMERS, LOCATION_BY_VALUE, FARMER_BY_VALUE,
  harvesterProp, slabsFor,
};
