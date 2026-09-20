const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');
const original = fs.readFileSync(path.join(__dirname, 'perks-twitter-banner.svg'), 'utf8');
const mark = original.match(/<g id="Perks-symbol"[^>]*>([\s\S]*?)<\/g>/)[1];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1500" height="500" viewBox="0 0 1500 500">
<title>Perks — Trade tokens. Claim gift cards.</title>
<desc>1500 by 500 editable banner. An illustrative Perks rewards selection panel with example retailer gift-card choices. Retailer names identify redemption options, not Perks-issued payment cards.</desc>
<defs>
 <linearGradient id="background" x1="0" y1="0" x2="1500" y2="500" gradientUnits="userSpaceOnUse"><stop stop-color="#034CF5"/><stop offset=".62" stop-color="#087EFF"/><stop offset="1" stop-color="#18B0FB"/></linearGradient>
 <clipPath id="banner"><path d="M0 0H1500V500H0Z"/></clipPath>
 <g id="brand-symbol">${mark}</g>
</defs>
<g clip-path="url(#banner)" font-family="Arial, Helvetica, sans-serif">
 <path fill="url(#background)" d="M0 0H1500V500H0Z"/>
 <g id="Supporting-bubbles">
  <rect x="-184" y="402" width="960" height="220" rx="110" transform="rotate(-9 296 512)" fill="#8FDDFF"/>
  <circle cx="1532" cy="26" r="148" fill="#91DFFF"/>
  <circle cx="791" cy="462" r="98" fill="#11151C"/>
  <path d="M746 458H831M801 428L831 458L801 488" fill="none" stroke="#FFFFFF" stroke-width="9"/>
 </g>
 <g id="Headline" font-weight="400" letter-spacing="-3">
  <text x="80" y="167" fill="#FFFFFF" font-size="79">Trade tokens.</text>
  <rect x="61" y="202" width="681" height="115" rx="57.5" fill="#FFFFFF"/>
  <text x="401.5" y="281" text-anchor="middle" fill="#11151C" font-size="76">Claim gift cards.</text>
 </g>
 <g id="Perks-rewards-panel" transform="translate(814 42) rotate(-4 328 213)">
  <rect x="0" y="10" width="656" height="427" rx="30" fill="#0054C7" opacity=".22"/>
  <rect width="656" height="427" rx="30" fill="#FFFFFF"/>
  <g id="Panel-brand" fill="#0866FA">
   <g transform="translate(16 5) scale(.067)"><use xlink:href="#brand-symbol"/></g>
   <text x="79" y="46" fill="#10151D" font-size="28" font-weight="700" letter-spacing="-1">perks</text>
  </g>
  <rect x="520" y="25" width="105" height="30" rx="15" fill="#EAF5FF"/>
  <text x="572.5" y="45" text-anchor="middle" fill="#0765F4" font-size="12" font-weight="700" letter-spacing="1">REWARDS</text>
  <text x="31" y="122" fill="#11151C" font-size="49" letter-spacing="-2">Your rewards</text>
  <text x="33" y="158" fill="#5D6C7D" font-size="22" letter-spacing="-.4">Pick something you’ll love.</text>
  <g id="Retailer-gift-card-choices">
   <g id="Amazon-choice" transform="translate(31 187)">
    <rect width="188" height="136" rx="17" fill="#10151D"/>
    <text x="19" y="30" fill="#A5DAFF" font-size="11" font-weight="700" letter-spacing="1.4">GIFT CARD</text>
    <text x="19" y="82" fill="#FFFFFF" font-size="34" letter-spacing="-1">Amazon</text>
    <path d="M146 110H169M162 103L169 110L162 117" fill="none" stroke="#A5DAFF" stroke-width="2.5"/>
   </g>
   <g id="Uber-choice" transform="translate(234 187)">
    <rect width="188" height="136" rx="17" fill="#9CDEFF"/>
    <text x="19" y="30" fill="#075DE6" font-size="11" font-weight="700" letter-spacing="1.4">GIFT CARD</text>
    <text x="19" y="82" fill="#10151D" font-size="36" letter-spacing="-1">Uber</text>
    <path d="M146 110H169M162 103L169 110L162 117" fill="none" stroke="#075DE6" stroke-width="2.5"/>
   </g>
   <g id="Apple-choice" transform="translate(437 187)">
    <rect width="188" height="136" rx="17" fill="#EAF3FC"/>
    <text x="19" y="30" fill="#5B6E84" font-size="11" font-weight="700" letter-spacing="1.4">GIFT CARD</text>
    <text x="19" y="82" fill="#10151D" font-size="36" letter-spacing="-1">Apple</text>
    <path d="M146 110H169M162 103L169 110L162 117" fill="none" stroke="#075DE6" stroke-width="2.5"/>
   </g>
  </g>
  <g id="Choose-gift-card-button">
   <rect x="31" y="350" width="594" height="51" rx="25.5" fill="#0965FA"/>
   <text x="328" y="383" text-anchor="middle" fill="#FFFFFF" font-size="21">Choose a gift card</text>
   <path d="M578 375.5H599M592 368.5L599 375.5L592 382.5" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
  </g>
 </g>
</g>
</svg>`;
fs.writeFileSync(path.join(__dirname, 'rewards-banner.svg'), svg);
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'rewards-banner.png')).then(info => console.log(JSON.stringify(info)));
