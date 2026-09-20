import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBrands, parseProducts, parsePrice, units, validateCardAmount } from '../lib/gift-cards';
import { cryptorefills } from '../lib/cryptorefills';

// Reduced fixtures from the September 19 read-only API probe, not paid-order responses.
const brand={brand_id:'amazon',brand:'Amazon.com',family:'Amazon.com',country_code:'US',kind:'giftcard',category:'e-commerce',is_out_of_stock:false};
const range={...brand,products:[{product_id:'range',is_dynamic:true,coin:'USDC',delivery_type:'by_email',
  range:{min:5,max:500,currency:'USD',step_size:1},face_value:{currency_code:'USD',amount:{type:'range',min:'5.00',max:'500.00'}}}]};

test('catalog excludes money cards, wrong countries and unavailable products',()=>{
  const cards=parseBrands({country_code:'US',all_brands:[brand,{...brand,brand_id:'visa',brand:'Rewarble VISA USD',category:'e-money'},
    {...brand,brand_id:'off',is_out_of_stock:true},{...brand,brand_id:'ca',country_code:'CA'}]},'US');
  assert.deepEqual(cards.map(c=>c.id),['amazon']);
  assert.throws(()=>parseBrands({country_code:'GB',all_brands:[]},'US'));
});
test('range amounts obey exact minimum, maximum and increment',()=>{
  const p=parseProducts([range],'US','Amazon.com')[0];
  for(const value of ['5','6','500'])assert.doesNotThrow(()=>validateCardAmount(p,value));
  for(const value of ['0','4','501','5.5','1e2','-5'])assert.throws(()=>validateCardAmount(p,value));
  assert.equal(units('5.18'),5180000n);
  assert.throws(()=>units('0.0000001'));
});
test('fixed cards cannot be silently changed to unsupported denominations',()=>{
  const p=parseProducts([{...brand,products:[{product_id:'fixed',is_dynamic:false,coin:'USDC',delivery_type:'by_email',
    denomination:'10 USD',face_value:{currency_code:'USD',amount:{type:'fixed',price:'10'}}}]}],'US','Amazon.com')[0];
  assert.doesNotThrow(()=>validateCardAmount(p,'10.00'));
  assert.throws(()=>validateCardAmount(p,'5'));
});
test('provider quote binds product and currency and never authorizes redemption',()=>{
  const p=parseProducts([range],'US','Amazon.com')[0];
  const q=parsePrice({product_id:'range',coin:'USDC',coin_amount:'5.18'},p,'5');
  assert.equal(q.providerAmount,'5.18');assert.equal(q.redeemable,false);
  assert.throws(()=>parsePrice({product_id:'wrong',coin:'USDC',coin_amount:'5.18'},p,'5'));
  assert.throws(()=>parsePrice({product_id:'range',coin:'SOL',coin_amount:'5.18'},p,'5'));
  assert.throws(()=>parsePrice({product_id:'range',coin:'USDC',coin_amount:'0'},p,'5'));
});
test('quote client uses only GET and validates the catalog before requesting price',async()=>{
  const old=process.env.CRYPTOREFILLS_PARTNER_ID;process.env.CRYPTOREFILLS_PARTNER_ID='test-partner';
  const calls:{url:URL;init?:RequestInit}[]=[];
  const transport=(async(input:RequestInfo|URL,init?:RequestInit)=>{
    const url=new URL(String(input));calls.push({url,init});
    return Response.json(url.pathname.includes('/price')?{product_id:'range',coin:'USDC',coin_amount:'5.18'}:[range]);
  }) as typeof fetch;
  try {
    const p=cryptorefills({userAgent:'test',ip:'192.0.2.1'},transport);
    await assert.rejects(p.price('US','Amazon.com','range','5.5'));
    assert.equal(calls.length,1);
    const q=await p.price('US','Amazon.com','range','5');
    assert.equal(q.providerAmount,'5.18');assert.equal(calls.length,3);
    assert.ok(calls.every(c=>c.init?.method==='GET'&&c.url.hostname==='api.cryptorefills.com'));
    assert.equal(calls[2].url.searchParams.get('brand_name'),'Amazon.com');
    assert.equal(new Headers(calls[2].init?.headers).get('X-Forwarded-For'),'192.0.2.1');
  } finally {if(old===undefined)delete process.env.CRYPTOREFILLS_PARTNER_ID;else process.env.CRYPTOREFILLS_PARTNER_ID=old;}
});
