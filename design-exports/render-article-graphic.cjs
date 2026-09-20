const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const paths=[...fs.readFileSync(path.join(root,'public/perks-mark.svg'),'utf8').matchAll(/<path\s+[^>]*d="([^"]+)"[^>]*\/>/g)].map(m=>`<path fill-rule="evenodd" d="${m[1]}"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="800" viewBox="0 0 2000 800"><title>Perks — Pressed glass</title><desc>Recessed Perks mark in a frosted blue glass surface, lit from the upper left. Editable 2000 by 800 article artwork.</desc><defs>
<linearGradient id="base" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#044ff7"/><stop offset=".4" stop-color="#0875ff"/><stop offset=".78" stop-color="#1093fc"/><stop offset="1" stop-color="#17a8fd"/></linearGradient>
<radialGradient id="light" cx=".28" cy=".12" r=".8" gradientTransform="translate(0 -.08) scale(1 1.2)"><stop stop-color="#b3e2ff" stop-opacity=".21"/><stop offset=".4" stop-color="#79b9e9" stop-opacity=".07"/><stop offset="1" stop-color="#5c9ed0" stop-opacity="0"/></radialGradient>
<linearGradient id="recess" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#edf7ff"/><stop offset=".35" stop-color="#c1ddff"/><stop offset=".7" stop-color="#83bcfc"/><stop offset="1" stop-color="#348ef3"/></linearGradient>
<linearGradient id="lip" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffffff" stop-opacity=".8"/><stop offset=".43" stop-color="#dcf4ff" stop-opacity=".85"/><stop offset="1" stop-color="#a7e5ff" stop-opacity=".5"/></linearGradient>
<filter id="pressed" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.8" result="blur"/><feOffset in="blur" dx="2.5" dy="4" result="shift"/><feComposite in="shift" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inside"/><feFlood flood-color="#034fa9" flood-opacity=".56"/><feComposite in2="inside" operator="in" result="shade"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/></feMerge></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="12" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
<radialGradient id="vignette"><stop offset=".35" stop-color="#020814" stop-opacity="0"/><stop offset="1" stop-color="#003eab" stop-opacity=".12"/></radialGradient>
</defs>
<g id="Satin-glass-surface"><path fill="url(#base)" d="M0 0H2000V800H0Z"/><path fill="url(#light)" d="M0 0H2000V800H0Z"/></g>
<g id="Debossed-Perks-mark" transform="translate(1080 410) rotate(-19) scale(2.4) translate(-474 -476)" stroke-linejoin="round">
<g transform="translate(.5 1.7)" fill="none" stroke="url(#lip)" stroke-width="3.3" filter="url(#soft)">${paths}</g>
<g fill="url(#recess)" filter="url(#pressed)">${paths}</g>
<g fill="none" stroke="#e4f6ff" stroke-opacity=".6" stroke-width=".6">${paths}</g>
</g>
<path id="Fine-frost" d="M0 0H2000V800H0Z" filter="url(#grain)" opacity=".018"/>
<path fill="url(#vignette)" d="M0 0H2000V800H0Z"/>
</svg>`;
fs.writeFileSync(path.join(__dirname,'perks-article-graphic.svg'),svg);
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=2000,initial-scale=1"><title>Perks — Pressed glass</title><style>html,body{margin:0;width:2000px;height:800px;overflow:hidden;background:#087fff}svg{display:block}</style></head><body>${svg}</body></html>`;
fs.writeFileSync(path.join(__dirname,'perks-article-graphic.html'),html);fs.writeFileSync(path.join(root,'public/design/perks-article-graphic.html'),html);
const sharp=require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');sharp(Buffer.from(svg)).png().toFile(path.join(__dirname,'perks-article-graphic.png')).then(()=>console.log('Rendered 2000 × 800'));
