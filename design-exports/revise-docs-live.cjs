const fs=require('fs');
const p='design-exports/render-docs-live.cjs';let s=fs.readFileSync(p,'utf8');
s=s.replace("const paths=", "const originalLogo=fs.readFileSync(path.join(root,'public/perks-mark.svg'),'utf8').replace(/<svg /,'<svg x=\"0\" y=\"1\" width=\"37\" height=\"37\" ').replace(/id=\"ice\"/g,'id=\"brand-ice\"').replace(/url\\(#ice\\)/g,'url(#brand-ice)').replace(/id=\"depth\"/g,'id=\"brand-depth\"').replace(/url\\(#depth\\)/g,'url(#brand-depth)');\nconst paths=");
s=s.replace('<linearGradient id="bg" x2="1" y2=".7"><stop stop-color="#044ff7"/><stop offset=".55" stop-color="#087fff"/><stop offset="1" stop-color="#17a8fd"/></linearGradient>', '<linearGradient id="bg" x2=".8" y2="1"><stop stop-color="#060b14"/><stop offset="1" stop-color="#09182b"/></linearGradient><radialGradient id="ambient"><stop stop-color="#086bd8" stop-opacity=".28"/><stop offset="1" stop-color="#086bd8" stop-opacity="0"/></radialGradient>');
s=s.replace('stop-color="#bce5ff" stop-opacity=".3"','stop-color="#234c79" stop-opacity=".55"').replace('stop-color="#94caff" stop-opacity=".08"','stop-color="#086bd8" stop-opacity=".16"');
s=s.replace('<path fill="url(#bg)" d="M0 0H1600V900H0Z"/>','<path fill="url(#bg)" d="M0 0H1600V900H0Z"/><ellipse cx="800" cy="670" rx="850" ry="610" fill="url(#ambient)"/>');
let a=s.indexOf('<g id="Brand">'),b=s.indexOf('<g id="Docs-window"',a);
s=s.slice(0,a)+`<g id="Site-header-wordmark" transform="translate(74 58) scale(1.3)">\${originalLogo}<text x="43" y="32" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="600" letter-spacing="-2.5" fill="#f8fbff">perks</text></g>
<g id="Announcement"><text x="800" y="218" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="2" fill="#83c5ff">GET TO KNOW PERKS</text><text x="800" y="320" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="106" font-weight="400" letter-spacing="-5.8" fill="#f4f8ff">Docs are <tspan fill="#89c6ff">live.</tspan></text><text x="800" y="372" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="23" fill="#a5b9d3">Your guide to launching, earning, and claiming.</text></g>
<g id="Window-backplate"><rect x="267" y="449" width="1066" height="690" rx="30" fill="url(#glass)" stroke="#8ec7ff" stroke-opacity=".18"/><rect x="280" y="462" width="1040" height="690" rx="25" fill="#0a1930" stroke="#8ec7ff" stroke-opacity=".2"/></g>
`+s.slice(b);
s=s.replace('translate(650 126) rotate(-6 510 360)','translate(296 478) scale(.934)');
s=s.replace('<g id="Social-pills">','<g id="Social-pills" transform="translate(1034 -733)">');
s=s.replace('background:#044ff7','background:#060b14');
fs.writeFileSync(p,s);
