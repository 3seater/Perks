const fs = require('fs');
const path = require('path');
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@22.20.4/node_modules/sharp');
const base = fs.readFileSync(path.join(__dirname, 'stacked-bubble-banner.svg'), 'utf8');
const svg = base
  .replace('Stacked bubbles — natural typography', 'Trade tokens. Claim gift cards.')
  .replace('id="More-bubble"', 'id="Trade-bubble"')
  .replace('id="For-you-bubble"', 'id="Tokens-bubble"')
  .replace('id="Perks-bubble"', 'id="Claim-gift-cards-bubble"')
  .replace('>more</text>', '>trade</text>')
  .replace('>for you.</text>', '>tokens.</text>')
  .replace('x="750" y="460"', 'x="750" y="448"')
  .replace('font-size="162" letter-spacing="-6">perks.</text>', 'font-size="105" letter-spacing="-4">claim gift cards.</text>');
fs.writeFileSync(path.join(__dirname, 'trade-bubbles-banner.svg'), svg);
sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, 'trade-bubbles-banner.png')).then(info => console.log(JSON.stringify(info)));
