// Copies the canonical front-end (the HubSpot module's CSS/JS) into backend/public
// so a single Vercel deployment can serve BOTH the page and the API. Run before
// deploying:  npm run sync-frontend
//
// Single source of truth stays in hubspot-module/harvest-weigh.module/ — this
// just mirrors it for the prototype host.

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'hubspot-module', 'harvest-weigh.module');
const OUT = path.join(__dirname, '..', 'public');

const copies = [
  ['module.css', 'app.css'],
  ['module.js', 'app.js'],
];

fs.mkdirSync(OUT, { recursive: true });
for (const [from, to] of copies) {
  fs.copyFileSync(path.join(SRC, from), path.join(OUT, to));
  console.log(`synced ${from} -> public/${to}`);
}
console.log('done.');
