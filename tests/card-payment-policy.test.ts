import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Keypair} from '@solana/web3.js';
import {maxCardDebit,parseCardPayment,solLamports,validateProblems,safeCardDetails} from '../lib/card-payment-policy';
import {lotBalance,rewardShare} from '../lib/trade-accounting';
import {cardOrderBody,cryptorefillsOrders} from '../lib/cryptorefills-orders';

test('prefunded spending conserves earnings across later collections',()=>{
  for(const collected of [0n,10n,500n,1000n]){
    const b=lotBalance({fee:1000n,collected,reserved:200n,spent:300n,bps:9500});
    assert.equal(b.pending+b.available,450n);
    assert.equal(b.pending+b.available+b.spent+b.reserved,rewardShare(1000n,9500));
    assert.ok(b.pending>=0n&&b.available>=0n);
  }
  assert.throws(()=>lotBalance({fee:1000n,collected:0n,reserved:951n,spent:0n,bps:9500}));
});
test('SOL payment precision and authorization limits use integer lamports',()=>{
  assert.equal(solLamports('0.000000001'),1n);
  assert.equal(solLamports('0.005629628'),5629628n);
  assert.equal(maxCardDebit(101n,5000n),5103n);
  for(const value of ['-1','1e-9','0.0000000001','Infinity'])assert.throws(()=>solLamports(value));
});
test('provider payment cannot substitute another asset, address or amount',()=>{
  const address=Keypair.generate().publicKey.toBase58();
  const r={order_id:'one',wallet_address:address,coin_amount:'0.01',qr_text:`solana:${address}?amount=0.01`};
  assert.equal(parseCardPayment(r).lamports,10000000n);
  assert.throws(()=>parseCardPayment({...r,coin:'USDC'}));
  assert.throws(()=>parseCardPayment({...r,network:'Base'}));
  assert.throws(()=>parseCardPayment({...r,qr_text:`solana:${address}?amount=0.02`}));
  assert.throws(()=>parseCardPayment({...r,qr_text:`solana:${address}?amount=0.01&spl-token=anything`}));
  assert.throws(()=>parseCardPayment({...r,qr_text:undefined}));
  assert.throws(()=>parseCardPayment({...r,qr_text:`https://example.com/${address}`}));
});
test('validation failures block order creation, and recipient data stays in POST bodies',async()=>{
  assert.equal(validateProblems({problems:[],coin_amount:'0.01'}),10000000n);
  assert.throws(()=>validateProblems({problems:[{problem:'KYC_MISSING'}]}));
  assert.throws(()=>validateProblems({coin_amount:'0.01'}));
  const body=cardOrderBody({id:'p',brand:'Example',country:'US',currency:'USD',denomination:'range',min:'5',max:'20',step:'1',terms:''},'5','recipient@example.com');
  assert.equal(body.user.has_accepted_newsletter,false);
  assert.equal(body.payment.coin,'SOL');
  let calls=0;
  process.env.CRYPTOREFILLS_PARTNER_ID='test';
  const transport:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input),'https://api.cryptorefills.com/v5/orders/validations');assert.equal(init?.method,'POST');return new Response(JSON.stringify({problems:[{problem:'OUT_OF_STOCK'}]}),{status:200});};
  await assert.rejects(cryptorefillsOrders({userAgent:'test'},transport).validate(body));assert.equal(calls,1);
});
test('delivery display only admits credential fields and safe links',()=>{
  assert.deepEqual(safeCardDetails({order_id:'secret-id',email:'private',deliveries:[{code:'ABC',pin:'123',redemption_url:'javascript:alert(1)'}]}),[{label:'Card code',value:'ABC'},{label:'PIN',value:'123'}]);
});

test('live native SOL invoice accepts a bare QR address only with explicit matching asset and network',()=>{
  const address=Keypair.generate().publicKey.toBase58();
  const response={order_id:'live-shape',wallet_address:address,coin_amount:'0.018602',coin:'SOL',network:'Solana',qr_text:address,order_state:'WaitingForPayment'};
  assert.equal(parseCardPayment(response).lamports,18602000n);
  assert.throws(()=>parseCardPayment({...response,coin:undefined}));
  assert.throws(()=>parseCardPayment({...response,network:undefined}));
  assert.throws(()=>parseCardPayment({...response,qr_text:Keypair.generate().publicKey.toBase58()}));
  assert.deepEqual(safeCardDetails({deliveries:[{deliverable:{pin_code:'1234',pin_serial:'5678',security_code:'90'}}]}),[{label:'Card code',value:'1234'},{label:'Serial number',value:'5678'},{label:'Security code',value:'90'}]);
});
