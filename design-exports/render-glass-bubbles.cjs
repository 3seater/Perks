const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');
const out = __dirname;
let svg = fs.readFileSync(path.join(out, 'round-bubbles-banner.svg'), 'utf8');
const defs = `
    <linearGradient id="frost" x1="15%" y1="0%" x2="70%" y2="100%"><stop stop-color="#F8FCFF"/><stop offset=".48" stop-color="#C1DDFF"/><stop offset="1" stop-color="#69ADFF"/></linearGradient>
    <linearGradient id="azure" x1="15%" y1="0%" x2="70%" y2="100%"><stop stop-color="#DFEFFF"/><stop offset=".45" stop-color="#9FCFFF"/><stop offset="1" stop-color="#388FF7"/></linearGradient>
    <linearGradient id="ink-glass" x1="10%" y1="0%" x2="70%" y2="100%"><stop stop-color="#142C50"/><stop offset=".48" stop-color="#123F85"/><stop offset="1" stop-color="#086BD8"/></linearGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="95%" y2="100%"><stop stop-color="#FFFFFF" stop-opacity=".95"/><stop offset=".4" stop-color="#A5DCFF" stop-opacity=".6"/><stop offset="1" stop-color="#D2FFFF" stop-opacity=".95"/></linearGradient>
    <linearGradient id="dark-rim" x1="0%" y1="0%" x2="95%" y2="100%"><stop stop-color="#A2D9FF" stop-opacity=".85"/><stop offset=".45" stop-color="#3B8EFF" stop-opacity=".45"/><stop offset="1" stop-color="#9DE9FF" stop-opacity=".9"/></linearGradient>
    <filter id="float-shadow" x="-35%" y="-60%" width="170%" height="240%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#00388E" flood-opacity=".36"/></filter>
    <filter id="letter-glow" x="-20%" y="-30%" width="140%" height="160%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="#FFFFFF" flood-opacity=".35"/></filter>
`;
svg = svg.replace('</defs>', defs + '</defs>')
  .replace('<title>Trade tokens. Claim gift cards.</title>', '<title>Perks — Frosted glass bubbles</title>')
  .replace('</desc>', ' Frosted blue surfaces, icy edge highlights, and soft floating shadows.</desc>');
svg = svg.replace(/<(rect|circle)\b[^>]*\/>/g, shape => {
  const dark = shape.includes('fill="#111318"');
  const azure = shape.includes('fill="#91DEFF"');
  return shape.replace(/fill="#[A-Fa-f0-9]+"/, `fill="url(#${dark ? 'ink-glass' : azure ? 'azure' : 'frost'})"`)
    .replace('/>', ` stroke="url(#${dark ? 'dark-rim' : 'rim'})" stroke-width="3" filter="url(#float-shadow)"/>`);
});
svg = svg.replace(/(<text\b[^>]*fill=")#111318/g, '$1#072C63')
  .replace(/stroke="#111318"/g, 'stroke="#083D80"')
  .replace(/(<path\b[^>]*fill=")#111318/g, '$1#083D80');
fs.writeFileSync(path.join(out, 'glass-bubbles-banner.svg'), svg);
let html = fs.readFileSync(path.join(out, 'banner-page/out/index.html'), 'utf8');
const style = `
/* All circles retain equal dimensions. No scaling is applied. */
.bubble{box-shadow:0 18px 32px rgba(0,56,142,.36),inset 0 3px 5px rgba(255,255,255,.75),inset 0 -3px 9px rgba(83,196,255,.42);isolation:isolate}
.bubble:after{content:"";position:absolute;inset:0;border-radius:inherit;border:2px solid rgba(201,239,255,.78);pointer-events:none}
.trade,.gift-cards,.spark-small{background:linear-gradient(145deg,#142c50 0%,#123f85 48%,#086bd8 100%);color:#fff;box-shadow:0 18px 32px rgba(0,56,142,.36),inset 0 3px 5px rgba(173,220,255,.36),inset 0 -3px 9px rgba(83,196,255,.35)}
.trade:after,.gift-cards:after,.spark-small:after{border-color:rgba(143,209,255,.58)}
.tokens,.spark-left{background:linear-gradient(145deg,#dfefff 0%,#9fcfff 45%,#388ff7 100%);color:#072c63}
.claim,.top-arrow,.right-arrow{background:linear-gradient(145deg,#f8fcff 0%,#c1ddff 48%,#69adff 100%);color:#072c63}
.top-arrow path,.right-arrow path{stroke:#083d80}
.spark-left path{fill:#083d80}
`;
html = html.replace('</style>', style + '</style>').replace('<title>Perks — Trade tokens. Claim gift cards.</title>', '<title>Perks — Frosted glass bubbles</title>');
fs.writeFileSync(path.join(out, 'glass-bubbles-banner.html'), html);
sharp(Buffer.from(svg)).png().toFile(path.join(out, 'glass-bubbles-banner.png')).then(console.log);
