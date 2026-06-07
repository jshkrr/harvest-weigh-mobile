// Generates PWA icons (PNG) per brand by rendering an SVG with headless Chrome.
// Run locally:  npm run gen-icons   (output → public/icons/, committed to git;
// Vercel has no Chrome so this can't run on their build).
//
// Each icon is full-bleed (works as "any" + "maskable"): brand gradient tile,
// a white grass mark, and the brand initials — all kept inside the maskable
// safe zone (central 80%).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const BRANDS = {
  CT: { color: '#1a4d2e', dark: '#0f3a20', initials: 'CT' },
  SA: { color: '#003366', dark: '#00243f', initials: 'SA' },
  JT: { color: '#2d5a1b', dark: '#1f4212', initials: 'JT' },
  AV: { color: '#4a7c2f', dark: '#365e21', initials: 'AV' },
};
const SIZES = [192, 512, 180]; // 180 = apple-touch-icon

const OUT = path.join(__dirname, '..', 'public', 'icons');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hwicons-'));
fs.mkdirSync(OUT, { recursive: true });

// Three white grass blades rising from a tuft, centred ~ (256,210).
function grass() {
  return `
    <g fill="none" stroke="#ffffff" stroke-width="22" stroke-linecap="round" opacity="0.95">
      <path d="M256 250 C 248 200, 236 165, 214 140"/>
      <path d="M256 250 C 256 195, 256 158, 256 132"/>
      <path d="M256 250 C 264 200, 276 165, 298 140"/>
    </g>`;
}

function svg(b) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${b.color}"/>
      <stop offset="1" stop-color="${b.dark}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  ${grass()}
  <text x="256" y="392" text-anchor="middle"
        font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
        font-weight="800" font-size="150" letter-spacing="2" fill="#ffffff">${b.initials}</text>
</svg>`;
}

function htmlWrap(svgStr, n) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head>
<body><svg width="${n}" height="${n}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${
    svgStr.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  }</svg></body></html>`;
}

for (const [code, b] of Object.entries(BRANDS)) {
  const baseSvg = svg(b);
  // also drop the raw SVG (handy for favicons / future use)
  fs.writeFileSync(path.join(OUT, `${code.toLowerCase()}.svg`), baseSvg);
  for (const n of SIZES) {
    const htmlPath = path.join(TMP, `${code}-${n}.html`);
    const outPath = path.join(OUT, `${code.toLowerCase()}-${n}.png`);
    fs.writeFileSync(htmlPath, htmlWrap(baseSvg, n));
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${n},${n}`,
      '--default-background-color=00000000',
      `--screenshot=${outPath}`,
      `file://${htmlPath}`,
    ], { stdio: 'ignore' });
    console.log(`  ${outPath}`);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('icons done.');
