import {z} from 'zod';
import {PublicKey} from '@solana/web3.js';

const amount=z.union([z.string(),z.number().finite()]).transform(String).pipe(z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,9})?$/));
export function solLamports(value:string):bigint {
  const [whole,fraction='']=amount.parse(value).split('.');
  return BigInt(whole)*1000000000n+BigInt(fraction.padEnd(9,'0'));
}
export function exactSol(value:bigint){return `${value/1000000000n}.${(value%1000000000n).toString().padStart(9,'0')}`;}
export function maxCardDebit(quote:bigint,fee:bigint){
  if(quote<=0n||fee<0n)throw new Error('Invalid card cost');
  // Explicitly authorized 1% provider-price ceiling; unused amount is released.
  return (quote*101n+99n)/100n+fee;
}
export function validateProblems(raw:unknown){
  const result=z.object({problems:z.array(z.object({problem:z.string()})),coin_amount:amount.optional()}).parse(raw);
  if(result.problems.length)throw new Error('This card could not be validated. Choose another card or check the recipient details.');
  return result.coin_amount?solLamports(result.coin_amount):null;
}
// Only native SOL on Solana is supported by this payment worker. Never infer
// an ERC20/SPL transfer or fetch arbitrary URLs supplied in a provider response.
export function parseCardPayment(raw:unknown,now=Date.now()) {
  const r=z.object({order_id:z.string().min(1).max(200),wallet_address:z.string(),coin_amount:amount,
    coin:z.literal('SOL').optional(),network:z.literal('Solana').optional(),
    qr_text:z.string().optional(),order_state:z.string().optional()}).parse(raw);
  const address=new PublicKey(r.wallet_address);
  if(address.equals(PublicKey.default))throw new Error('Invalid payment address');
  if(r.qr_text===address.toBase58()){
    // Cryptorefills returns a bare address for native SOL invoices.
    // Require explicit asset and network rather than inferring from the address.
    if(r.coin!=='SOL'||r.network!=='Solana')throw new Error('Provider did not identify native SOL payment');
  }else if(r.qr_text){
    const uri=new URL(r.qr_text);
    if(uri.protocol!=='solana:'||uri.pathname!==address.toBase58()||uri.searchParams.has('spl-token'))throw new Error('Payment network mismatch');
    const n=uri.searchParams.get('amount');
    if(n&&solLamports(n)!==solLamports(r.coin_amount))throw new Error('Payment amount mismatch');
  }else if(r.coin!=='SOL'||r.network!=='Solana')throw new Error('Provider did not identify native SOL payment');
  const lamports=solLamports(r.coin_amount);
  if(lamports<=0n)throw new Error('Invalid payment amount');
  return {id:r.order_id,address:address.toBase58(),lamports,expiresAt:new Date(now+25*60*1000)};
}
export const providerState=(raw:unknown)=>z.object({order_id:z.string(),order_state:z.string()}).parse(raw);
export const unpaidTerminal=new Set(['Expired','PaymentSetupFailed']);
export function safeCardDetails(raw:unknown):{label:string;value:string}[]{
  // Allow-list credential fields; no arbitrary provider HTML is rendered.
  const labels:Record<string,string>={code:'Card code',pin:'PIN',pin_code:'Card code',pin_serial:'Serial number',security_code:'Security code',voucher_code:'Card code',card_number:'Card number',redemption_url:'Redemption link',pin_usage_instructions:'How to redeem',redeem_instructions:'Redemption instructions'};
  const found:{label:string;value:string}[]=[];
  function walk(value:unknown,depth:number){
    if(depth>6||!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.slice(0,20).forEach(v=>walk(v,depth+1));return;}
    for(const [key,v] of Object.entries(value)){
      if(labels[key]&&typeof v==='string'&&v.length>0&&v.length<3000){
        if(key==='redemption_url'&&!v.startsWith('https://'))continue;
        found.push({label:labels[key],value:v});
      }else if(['deliveries','deliverable','product','products','vouchers','voucher','giftcard','gift_card','data'].includes(key))walk(v,depth+1);
    }
  }
  walk(raw,0);return found;
}
