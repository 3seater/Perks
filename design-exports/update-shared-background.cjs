const fs=require('fs'),path=require('path');
const out=__dirname;
const launch=fs.readFileSync(path.join(out,'perks-is-live.svg'),'utf8');
const defs=launch.slice(launch.indexOf('<linearGradient id="launch-glass"'),launch.indexOf('</defs>'));
const body=launch.slice(launch.indexOf('<g id="Atmospheric-background"'),launch.indexOf('<g id="Announcement"'));
fs.writeFileSync(path.join(out,'approved-background.json'),JSON.stringify({defs,body},null,2));
fs.copyFileSync(path.join(out,'perks-docs-live.svg'),path.join(out,'perks-docs-base.svg'));
fs.writeFileSync(path.join(out,'apply-graphic-background.cjs'),`const {defs,body}=require('./approved-background.json');
module.exports=function(svg){
  if(svg.includes('id="Atmospheric-background"')) return svg;
  return svg.replace('</defs>',defs+'</defs>').replace('<g id="Site-header-wordmark"',body+'<g id="Site-header-wordmark"');
};\n`);
for(const name of ['render-docs-live.cjs','render-dev-supply-burned.cjs']){
 const file=path.join(out,name); let s=fs.readFileSync(file,'utf8');
 s=s.replace("path.join(out,'perks-docs-live.svg'),'utf8'","path.join(out,'perks-docs-base.svg'),'utf8'");
 s=s.replace('const svg=', 'let svg=');
 s=s.replace("fs.writeFileSync(path.join(out,", "svg=require('./apply-graphic-background.cjs')(svg);\nfs.writeFileSync(path.join(out,");
 fs.writeFileSync(file,s);
}
const live=path.join(out,'render-perks-is-live.cjs');let s=fs.readFileSync(live,'utf8').replace("path.join(out,'perks-docs-live.svg'),'utf8'","path.join(out,'perks-docs-base.svg'),'utf8'");fs.writeFileSync(live,s);
