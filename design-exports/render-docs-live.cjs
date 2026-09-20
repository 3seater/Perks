const fs=require('fs'),path=require('path');
const out=__dirname,root=path.join(out,'..');
const originalLogo=fs.readFileSync(path.join(root,'public/perks-mark.svg'),'utf8').replace(/<svg /,'<svg x="0" y="1" width="37" height="37" ').replace(/id="ice"/g,'id="brand-ice"').replace(/url\(#ice\)/g,'url(#brand-ice)').replace(/id="depth"/g,'id="brand-depth"').replace(/url\(#depth\)/g,'url(#brand-depth)');
const paths=[...fs.readFileSync(path.join(root,'public/perks-mark.svg'),'utf8').matchAll(/<path\s+[^>]*d="([^"]+)"[^>]*\/>/g)].map(m=>`<path fill-rule="evenodd" d="${m[1]}"/>`).join('');
const logo=(x,y,s,fill='url(#ice)')=>`<g transform="translate(${x} ${y}) scale(${s}) translate(-140 -225)" fill="${fill}">${paths}</g>`;
const text=(x,y,size,value,color='#f4f8ff',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${value}</text>`;
const handle=process.argv[2]||'@perkspad';
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><title>Perks — Docs are live</title><defs>
<linearGradient id="bg" x2=".8" y2="1"><stop stop-color="#060b14"/><stop offset="1" stop-color="#09182b"/></linearGradient><radialGradient id="ambient"><stop stop-color="#086bd8" stop-opacity=".28"/><stop offset="1" stop-color="#086bd8" stop-opacity="0"/></radialGradient>
<linearGradient id="ice" x2=".7" y2="1"><stop stop-color="#fff"/><stop offset=".5" stop-color="#d1e7ff"/><stop offset="1" stop-color="#75baff"/></linearGradient>
<linearGradient id="glass" x2="1" y2="1"><stop stop-color="#234c79" stop-opacity=".55"/><stop offset="1" stop-color="#086bd8" stop-opacity=".16"/></linearGradient>
<linearGradient id="rim" x2=".9" y2="1"><stop stop-color="#e7f6ff" stop-opacity=".9"/><stop offset=".5" stop-color="#9dd8ff" stop-opacity=".3"/><stop offset="1" stop-color="#e0faff" stop-opacity=".65"/></linearGradient>
<linearGradient id="panel" x2="1" y2="1"><stop stop-color="#183354"/><stop offset="1" stop-color="#09284c"/></linearGradient>
<filter id="frame-glow" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="8"/></filter>
</defs><path fill="url(#bg)" d="M0 0H1600V900H0Z"/><ellipse cx="800" cy="670" rx="850" ry="610" fill="url(#ambient)"/>
<g id="Site-header-wordmark" transform="translate(74 58) scale(1.3)">${originalLogo}<text x="43" y="32" font-family="Arial, Helvetica, sans-serif" font-size="39" font-weight="600" letter-spacing="-2.5" fill="#f8fbff">perks</text></g>
<g id="Announcement"><text x="800" y="320" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="106" font-weight="400" letter-spacing="-5.8" fill="#f4f8ff">Docs are <tspan fill="#89c6ff">live.</tspan></text><text x="800" y="372" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="23" fill="#a5b9d3">Your guide to launching, earning, and claiming.</text></g>

<g id="Docs-window" transform="translate(296 478) scale(.934)"><rect width="1080" height="760" rx="23" fill="none" stroke="#3897ef" stroke-width="2" opacity=".24" filter="url(#frame-glow)"/>
<rect width="1080" height="760" rx="23" fill="#07111f" stroke="#8ec7ff" stroke-opacity=".4" stroke-width="1"/>
<path d="M23 1H1057Q1079 1 1079 23V53H1V23Q1 1 23 1" fill="#10243b"/>
${logo(21,17,.033)}${text(53,33,12,'perksp.ad/docs','#a9c9e8')}<path d="M1034 34L1046 22M1035 22H1046V33" fill="none" stroke="#a9c9e8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 53H1079" stroke="#8ec7ff" stroke-opacity=".13"/>
<path d="M1 54H208V759H23Q1 759 1 737Z" fill="#0c1c30"/><path d="M208 54V760" stroke="#8dbbff" stroke-opacity=".18"/>
${logo(22,80,.052)}${text(63,106,25,'perks','#f4f8ff',600)}
<rect x="18" y="134" width="172" height="31" rx="15" fill="#142c47" stroke="#7394b5" stroke-opacity=".25"/>${text(33,154,11,'⌕   Search docs...','#99b3d0')}
${text(21,206,9,'GETTING STARTED','#819ec1',600)}<path fill="#224263" d="M1 221H207V254H1Z"/>${text(31,242,12,'Overview','#a8d7ff',600)}${text(31,276,12,'Quick start','#a7bdd5')}${text(31,310,12,'Launching a token','#a7bdd5')}
${text(21,363,9,'USING PERKS','#819ec1',600)}${text(31,398,12,'Trading rewards','#a7bdd5')}${text(31,432,12,'Gift cards','#a7bdd5')}${text(31,466,12,'Safety &amp; risk','#a7bdd5')}${text(21,519,9,'RESOURCES','#819ec1',600)}${text(31,554,12,'FAQ','#a7bdd5')}${text(31,588,12,'Support','#a7bdd5')}
${text(249,107,9,'GETTING STARTED','#83c5ff',600)}${text(247,155,36,'What is Perks?')}
${text(249,194,13,'A little something for active traders. Discover tokens,','#a3bdd8')}${text(249,215,13,'earn trading rewards, and turn them into digital gift cards.','#a3bdd8')}
${[['Discover and launch','Explore tokens and prepare','your next launch.'],['Follow your rewards','Track available rewards','and pending collection.'],['Choose your perk','Browse digital gift cards','from brands you love.'],['Stay in control','Review and approve with','your own wallet.']].map((card,i)=>{const x=249+(i%2)*270,y=252+Math.floor(i/2)*177;return `<g><rect x="${x}" y="${y}" width="251" height="160" rx="17" fill="url(#panel)" stroke="#81baff" stroke-opacity=".3"/><circle cx="${x+32}" cy="${y+33}" r="16" fill="url(#ice)"/>${logo(x+20,y+23,.037,'#124680')}${text(x+20,y+79,14,card[0],'#eaf5ff',600)}${text(x+20,y+104,11,card[1],'#a5bed9')}${text(x+20,y+124,11,card[2],'#a5bed9')}</g>`}).join('')}
${text(249,641,16,'Before you begin','#eaf5ff',600)}${text(249,671,12,'Connect your Solana wallet and explore what Perks has to offer.','#a3bdd8')}<path d="M249 700H770" stroke="#b1d8ff" stroke-opacity=".15"/>${text(249,739,22,'Quick start','#eaf5ff')}
${text(820,107,9,'ON THIS PAGE','#819ec1',600)}${['Overview','Quick start','Launching a token','Trading rewards','Gift cards','Safety & risk','FAQ','Support'].map((s,i)=>text(830,140+i*29,11,s.replace('&','&amp;'),i?'#92aecb':'#83c5ff')).join('')}
</g>
<g id="Social-pills" transform="translate(1123 -733)"><rect x="78" y="794" width="132" height="45" rx="22.5" fill="url(#glass)" stroke="url(#rim)"/><circle cx="103" cy="816" r="8" fill="none" stroke="#eef8ff" stroke-width="1.3"/><path d="M95 816H111M103 808C99 813 99 819 103 824C107 819 107 813 103 808" fill="none" stroke="#eef8ff" stroke-width="1"/>${text(121,822,16,'perksp.ad')}<rect x="222" y="794" width="145" height="45" rx="22.5" fill="url(#glass)" stroke="url(#rim)"/><path d="M242 809L255 824M255 809L242 824" stroke="#eef8ff" stroke-width="1.6"/>${text(269,822,16,handle)}</g>
</svg>`;
svg=require('./apply-graphic-background.cjs')(svg);
fs.writeFileSync(path.join(out,'perks-docs-live.svg'),svg);
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=1600,initial-scale=1"><title>Perks — Docs are live</title><style>html,body{margin:0;width:1600px;height:900px;overflow:hidden;background:#060b14}svg{display:block}</style></head><body>${svg}</body></html>`;
fs.writeFileSync(path.join(out,'perks-docs-live.html'),html);fs.writeFileSync(path.join(root,'public/design/perks-docs-live.html'),html);
const sharp=require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');sharp(Buffer.from(svg)).png().toFile(path.join(out,'perks-docs-live.png')).then(()=>console.log('Rendered 1600 × 900'));
