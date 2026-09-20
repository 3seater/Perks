const fs=require('fs'),path=require('path');
const out=__dirname;
const posts=[['perks-see-your-rewards','See your perks'],['perks-pick-a-gift-card','Pick your gift card'],['perks-choose-your-amount','Your card. Your amount.'],['perks-launch-with-rewards','Launch with rewards']];
const cards=posts.map(([slug,title],i)=>{
 let svg=fs.readFileSync(path.join(out,slug+'.svg'),'utf8');
 // Each inline artboard needs independent gradient/filter IDs.
 const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of new Set(ids)){
  const scoped=`post-${i}-${id}`;
  svg=svg.replaceAll(`id="${id}"`,`id="${scoped}"`).replaceAll(`url(#${id})`,`url(#${scoped})`).replaceAll(`href="#${id}"`,`href="#${scoped}"`);
 }
 return `<section class="artboard" aria-label="${title}">${svg}</section>`;
}).join('\n');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Perks — All four informative graphics</title><style>*{box-sizing:border-box}html,body{margin:0;background:#030810}body{padding:24px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:3224px;margin:auto}.artboard{aspect-ratio:16/9;min-width:0;overflow:hidden;background:#060b14}.artboard>svg{display:block;width:100%;height:auto}@media print{body{padding:0}main{gap:0}}</style></head><body><main aria-label="Perks social graphics">${cards}</main></body></html>`;
fs.writeFileSync(path.join(out,'perks-informative-series.html'),html);
fs.writeFileSync(path.join(out,'../public/design/perks-informative-series.html'),html);
console.log('Built single-page gallery: four inline SVG artboards, no iframes.');
