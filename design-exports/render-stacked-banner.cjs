const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');
// Bake the established bubble silhouettes into final canvas coordinates.
// Typography is drawn separately at its real size, with rotation only.
function capsule(x, y, w, h, degrees) {
  const r = h / 2, k = .5522847498307936, a = degrees * Math.PI / 180;
  const point = (px, py) => {
    const dx = px - w / 2, dy = py - h / 2;
    return [((x + w / 2 + dx * Math.cos(a) - dy * Math.sin(a)) - 660) * 15 / 7,
      ((y + h / 2 + dx * Math.sin(a) + dy * Math.cos(a)) - 58) * 1.25].map(v => v.toFixed(3)).join(' ');
  };
  return `M${point(r,0)} L${point(w-r,0)} C${point(w-r+k*r,0)} ${point(w,r-k*r)} ${point(w,r)} C${point(w,r+k*r)} ${point(w-r+k*r,h)} ${point(w-r,h)} L${point(r,h)} C${point(r-k*r,h)} ${point(0,r+k*r)} ${point(0,r)} C${point(0,r-k*r)} ${point(r-k*r,0)} ${point(r,0)} Z`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500">
<title>Stacked bubbles — natural typography</title>
<desc>Editable 1500 by 500 banner. All lettering uses its natural proportions, with rotation only.</desc>
<defs><linearGradient id="background" x1="0" y1="0" x2="1500" y2="500" gradientUnits="userSpaceOnUse"><stop stop-color="#0450FA"/><stop offset="1" stop-color="#19A8FB"/></linearGradient></defs>
<path id="Background" fill="url(#background)" d="M0 0H1500V500H0Z"/>
<g id="More-bubble"><path fill="#101318" d="${capsule(744,171,292,126,-24)}"/>
<text x="492.857" y="260" transform="rotate(-14.558 492.857 220)" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="138" letter-spacing="-4">more</text></g>
<g id="For-you-bubble"><path fill="#91DFFF" d="${capsule(1035,197,328,126,14)}"/>
<text x="1155" y="289" transform="rotate(8.276 1155 252.5)" text-anchor="middle" fill="#101318" font-family="Arial, Helvetica, sans-serif" font-size="124" letter-spacing="-4">for you.</text></g>
<g id="Top-arrow"><ellipse cx="1095" cy="75" rx="128.571" ry="75" fill="#FFFFFF"/>
<path d="M1140 75H1050M1080 45L1050 75L1080 105" fill="none" stroke="#101318" stroke-width="9"/></g>
<g id="Sparkle"><ellipse cx="141.429" cy="417.5" rx="141.429" ry="82.5" fill="#91DFFF"/>
<path d="M141.429 362.5C147.429 398.5 160.429 411.5 196.429 417.5C160.429 423.5 147.429 436.5 141.429 472.5C135.429 436.5 122.429 423.5 86.429 417.5C122.429 411.5 135.429 398.5 141.429 362.5Z" fill="#101318"/></g>
<g id="Perks-bubble"><rect x="282.857" y="335" width="934.286" height="165" rx="141.429" ry="82.5" fill="#F5FAFF"/>
<text x="750" y="460" text-anchor="middle" fill="#101318" font-family="Arial, Helvetica, sans-serif" font-size="162" letter-spacing="-6">perks.</text></g>
<g id="Right-arrow"><ellipse cx="1358.571" cy="417.5" rx="141.429" ry="82.5" fill="#101318"/>
<path d="M1309 417.5H1408M1374 383.5L1408 417.5L1374 451.5" fill="none" stroke="#FFFFFF" stroke-width="9"/></g>
</svg>`;
fs.writeFileSync(path.join(__dirname, 'stacked-bubble-banner.svg'), svg);
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'stacked-bubble-banner.png')).then(info => console.log(JSON.stringify(info)));
