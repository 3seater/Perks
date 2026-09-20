const fs=require('fs'); const file='design-exports/render-perks-is-live.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace('const svg=head+',`const revisedHead=head.replace('</defs>', '<radialGradient id="launch-light"><stop stop-color="#247bca" stop-opacity=".22"/><stop offset="1" stop-color="#1260b5" stop-opacity="0"/></radialGradient><radialGradient id="text-shade"><stop stop-color="#071426" stop-opacity=".86"/><stop offset=".5" stop-color="#071426" stop-opacity=".65"/><stop offset="1" stop-color="#071426" stop-opacity="0"/></radialGradient>');
const svg=revisedHead+`);
const start=s.indexOf('<g id="Launch-mark"');const end=s.indexOf('`+socials;',start);
s=s.slice(0,start)+`<g id="Atmospheric-background"><ellipse cx="340" cy="300" rx="700" ry="630" fill="url(#launch-light)"/><ellipse cx="1370" cy="810" rx="830" ry="730" fill="url(#launch-light)"/>
<g transform="translate(880 480) rotate(-29) scale(3.55) translate(-474 -476)" stroke-linejoin="round" opacity=".28"><g fill="url(#launch-glass)" filter="url(#pressed)">\${paths}</g><g fill="none" stroke="url(#launch-rim)" stroke-width=".55">\${paths}</g></g>
<ellipse cx="800" cy="450" rx="760" ry="440" fill="url(#text-shade)"/></g>
<g id="Announcement" font-family="Arial, Helvetica, sans-serif" font-weight="400" letter-spacing="-7"><text x="800" y="489" text-anchor="middle" font-size="124" fill="#f4f8ff">$PERKS <tspan fill="#89c6ff">is live.</tspan></text></g>`+s.slice(end);
fs.writeFileSync(file,s);
