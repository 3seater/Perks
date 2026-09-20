const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');
const original = fs.readFileSync(path.join(__dirname, 'perks-twitter-banner.svg'), 'utf8');
const mark = original.match(/<g id="Perks-symbol"[^>]*>([\s\S]*?)<\/g>/)[1];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1500" height="500" viewBox="0 0 1500 500">
<title>Perks — Launch tokens. Earn gift cards.</title>
<desc>Editable vector banner with a stack of illustrative Perks gift cards. Text retains natural proportions. 1500 by 500 pixels.</desc>
<defs>
 <linearGradient id="background" x1="0" y1="0" x2="1500" y2="500" gradientUnits="userSpaceOnUse"><stop stop-color="#034CF5"/><stop offset=".62" stop-color="#087EFF"/><stop offset="1" stop-color="#18B0FB"/></linearGradient>
 <linearGradient id="ice" x1="0" y1="0" x2="470" y2="290" gradientUnits="userSpaceOnUse"><stop stop-color="#C4F0FF"/><stop offset="1" stop-color="#7BD4FF"/></linearGradient>
 <clipPath id="banner"><path d="M0 0H1500V500H0Z"/></clipPath>
 <g id="brand-symbol">${mark}</g>
 <g id="gift-icon" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"><path d="M-24-6H24V8H-24ZM-19 8V33H19V8M0-6V33"/><path d="M0-6C-29-6-25-32-12-24C-5-20 0-6 0-6ZM0-6C29-6 25-32 12-24C5-20 0-6 0-6Z"/></g>
</defs>
<g clip-path="url(#banner)">
 <path fill="url(#background)" d="M0 0H1500V500H0Z"/>
 <g id="Supporting-bubbles">
  <rect x="-184" y="389" width="975" height="226" rx="113" transform="rotate(-9 303.5 502)" fill="#8FDDFF"/>
  <circle cx="814" cy="457" r="103" fill="#11151C"/>
  <path d="M768 457H857M826 426L857 457L826 488" fill="none" stroke="#FFFFFF" stroke-width="9"/>
  <circle cx="1532" cy="71" r="156" fill="#91DFFF"/>
 </g>
 <g id="Headline" font-family="Arial, Helvetica, sans-serif" font-weight="400" letter-spacing="-3.5">
  <text x="81" y="161" fill="#FFFFFF" font-size="78">Launch tokens.</text>
  <rect x="63" y="191" width="655" height="116" rx="58" fill="#FFFFFF"/>
  <text x="390.5" y="271" text-anchor="middle" fill="#11151C" font-size="78">Earn gift cards.</text>
 </g>
 <g id="Ice-gift-card" transform="translate(841 -86) rotate(-19 232 145)">
  <rect width="464" height="290" rx="27" fill="url(#ice)"/>
  <text x="33" y="57" fill="#064CF0" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="-1">perks</text>
  <g transform="translate(317 -7) scale(.13)" fill="#064CF0"><use xlink:href="#brand-symbol"/></g>
  <text x="34" y="187" fill="#064CF0" font-family="Arial, Helvetica, sans-serif" font-size="54" letter-spacing="-2">Gift card</text>
 </g>
 <g id="Black-gift-card" transform="translate(1025 88) rotate(14 235 145)">
  <rect x="-2" y="5" width="468" height="294" rx="28" fill="#004CDC" fill-opacity=".16"/>
  <rect width="470" height="290" rx="27" fill="#11151C"/>
  <text x="33" y="57" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="-1">perks</text>
  <g transform="translate(324 -7) scale(.13)" fill="#91DFFF"><use xlink:href="#brand-symbol"/></g>
  <text x="34" y="170" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="54" letter-spacing="-2">Gift card</text>
  <path d="M34 238H183" stroke="#91DFFF" stroke-width="8" stroke-linecap="round"/>
 </g>
 <g id="White-gift-card" transform="translate(868 206) rotate(-10 242 145)">
  <rect x="0" y="9" width="484" height="290" rx="27" fill="#003FBE" fill-opacity=".2"/>
  <rect width="484" height="290" rx="27" fill="#FFFFFF"/>
  <text x="34" y="57" fill="#10151D" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="-1">perks</text>
  <g transform="translate(337 -7) scale(.13)" fill="#0766FF"><use xlink:href="#brand-symbol"/></g>
  <text x="34" y="169" fill="#10151D" font-family="Arial, Helvetica, sans-serif" font-size="64" letter-spacing="-2.5">Gift card</text>
  <text x="35" y="251" fill="#075FFB" font-family="Arial, Helvetica, sans-serif" font-size="23" letter-spacing="-.5">A little extra, for you.</text>
  <g transform="translate(424 233)" color="#0766FF"><use xlink:href="#gift-icon"/></g>
 </g>
</g>
</svg>`;
fs.writeFileSync(path.join(__dirname, 'giftcard-banner.svg'), svg);
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'giftcard-banner.png')).then(info => console.log(JSON.stringify(info)));
