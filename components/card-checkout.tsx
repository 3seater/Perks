'use client';
import {useEffect,useState} from 'react';
import {useWallet} from '@solana/wallet-adapter-react';
import {LoaderCircle,CheckCircle2,AlertCircle,Clock3,RefreshCw,ChevronDown,Copy,Check,Gift} from 'lucide-react';
import bs58 from 'bs58';
import type {CardProduct} from '@/lib/gift-cards';
import {api} from '@/lib/client';
import {SolEquivalent,RewardCost,money} from './reward-money';
import {cardInstructionText} from '@/lib/card-instructions';
import {formatRewardSol} from '@/lib/format-rewards';
import {WalletMultiButton} from './wallet-button';

type Quote={id:string;message:string;maxDebitLamports:string;expiresAt:string};
type Proof={id:string;signature:string};
type Order={logo:string|null;createdAt:string;id:string;status:string;brand:string;amount:string;currency:string;error:string|null;actualDebitLamports:string|null;details:{label:string;value:string}[]};
const sol=(n:string)=>(Number(n)/1e9).toLocaleString('en-US',{maximumFractionDigits:9});
const storageKey=(wallet:string)=>`perks-card-orders:${wallet}`;
function saved(wallet:string):Proof[]{try{return JSON.parse(localStorage.getItem(storageKey(wallet))??'[]');}catch{return [];}}
function remember(wallet:string,proof:Proof){localStorage.setItem(storageKey(wallet),JSON.stringify([proof,...saved(wallet).filter(p=>p.id!==proof.id)].slice(0,20)));window.dispatchEvent(new Event('perks:card-order'));}

export function CardCheckout({product,family,amount,onSubmitted}:{product:CardProduct;family:string;amount:string;onSubmitted?:(id:string)=>void}){
  const {publicKey,signMessage}=useWallet(),wallet=publicKey?.toBase58();
  const [email,setEmail]=useState(''),[accepted,setAccepted]=useState(false),[quote,setQuote]=useState<Quote|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState<{enabled:boolean;reason:string}|null>(null);
  const [submitted,setSubmitted]=useState(false);
  useEffect(()=>{let active=true;async function refresh(){try{const r=await api<{enabled:boolean;reason:string}>('/api/card-checkout');if(active)setReady(r);}catch{if(active)setReady({enabled:false,reason:'Checkout is temporarily unavailable.'});}}
    void refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[]);
  useEffect(()=>{setQuote(null);setSubmitted(false);setError('');},[wallet,email,amount,product.id]);
  async function review(event:React.FormEvent){
    event.preventDefault();if(!wallet)return;setBusy(true);setError('');
    try{setQuote(await api<Quote>('/api/card-checkout',{action:'quote',wallet,country:product.country,family,product:product.id,amount,email}));}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function purchase(){
    if(!quote||!wallet||!signMessage)return;
    setBusy(true);setError('');
    try{
      if(Date.parse(quote.expiresAt)<=Date.now()){setQuote(null);throw new Error('Your quote expired. Review the price again.');}
      const signature=bs58.encode(await signMessage(new TextEncoder().encode(quote.message)));
      // Save before submission: even a lost HTTP response can be recovered.
      remember(wallet,{id:quote.id,signature});
      await api('/api/card-checkout',{action:'authorize',id:quote.id,signature});
      setSubmitted(true);onSubmitted?.(quote.id);setQuote(null);window.dispatchEvent(new Event('perks:rewards-updated'));
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="card-checkout">
    {submitted?<p role="status"><CheckCircle2 size={18}/> Your card purchase is processing. Your purchase status will update automatically.</p>:<form onSubmit={review}>
      <div className="checkout-summary"><span>{product.brand} gift card</span><span className="reward-money"><strong>{money(amount,product.currency)}</strong><SolEquivalent amount={amount} currency={product.currency}/></span></div>
      {!quote&&<><label>Delivery email<input type="email" autoComplete="email" value={email} required disabled={busy} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label className="checkout-consent"><input type="checkbox" checked={accepted} required disabled={busy} onChange={e=>setAccepted(e.target.checked)}/><span>I agree to <a href="https://www.cryptorefills.com/en/terms-and-conditions" target="_blank" rel="noreferrer">Cryptorefills’ terms</a> and have checked this card’s country and redemption conditions.</span></label></>}
      {!wallet?<div className="checkout-connect"><WalletMultiButton/></div>:quote?<><p className="checkout-recipient">Deliver to <strong>{email}</strong> <button type="button" className="text-button" onClick={()=>setQuote(null)}>Edit</button></p><div className="catalog-quote"><div><span>Maximum reward deduction</span><RewardCost lamports={quote.maxDebitLamports}/></div><p>Includes fees and a 1% price allowance. Unused rewards are returned.</p></div>
        <button type="button" className="button primary full" disabled={busy||!accepted||!signMessage} onClick={purchase}>{busy?<LoaderCircle className="spin" size={18}/>:null}{busy?'Authorizing…':'Confirm with rewards'}</button>
      </>:<button className="button primary full" disabled={busy||!ready?.enabled||!accepted||!signMessage}>{busy?<LoaderCircle className="spin" size={18}/>:null}{busy?'Checking your rewards…':'Review reward purchase'}</button>}
      {!ready?.enabled&&<p className="secure-note">{ready?.reason??'Checking checkout…'}</p>}
      <span className="checkout-provider">Powered by Cryptorefills</span>
    </form>}
    {error&&<p role="alert" className="error-message">{error}</p>}
  </div>;
}

export function CardOrders({focusedId}:{focusedId?:string}={}){
  const {publicKey,signMessage}=useWallet(),wallet=publicKey?.toBase58();
  const [orders,setOrders]=useState<Order[]>([]),[error,setError]=useState('');
  const [restoring,setRestoring]=useState(false);
  useEffect(()=>{
    let active=true;setOrders([]);setError('');if(!wallet)return;
    const address=wallet;
    async function refresh(){
      const results=await Promise.allSettled(saved(address).filter(p=>!focusedId||p.id===focusedId).slice(0,20).map(p=>api<Order>('/api/card-checkout',{action:'status',...p})));
      if(!active)return;
      const found=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
      setOrders(previous=>{const map=new Map(previous.map(o=>[o.id,o]));for(const o of found)map.set(o.id,o);return [...map.values()].slice(0,20);});
      setError(results.some(r=>r.status==='rejected')?'Updating your purchases…':'');
      if(found.some(o=>['DELIVERED','PAID','FAILED'].includes(o.status)))window.dispatchEvent(new Event('perks:rewards-updated'));
    }
    void refresh();const timer=setInterval(refresh,7000);window.addEventListener('perks:card-order',refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('perks:card-order',refresh);};
  },[wallet,focusedId]);
  async function retry(id:string){
    if(!wallet)return;const proof=saved(wallet).find(p=>p.id===id);if(!proof)return;
    try{await api('/api/card-checkout',{action:'authorize',...proof});window.dispatchEvent(new Event('perks:card-order'));setError('');}catch(e){setError((e as Error).message);}
  }
  async function restore(){
    if(!wallet||!signMessage)return;setRestoring(true);setError('');
    try{const challenge=await api<{message:string;issuedAt:number}>(`/api/card-checkout?wallet=${wallet}`);
      const signature=bs58.encode(await signMessage(new TextEncoder().encode(challenge.message)));
      const result=await api<{proofs:Proof[]}>('/api/card-checkout',{action:'history',wallet,issuedAt:challenge.issuedAt,signature});
      for(const p of result.proofs)remember(wallet,p);
      if(!result.proofs.length)setError('No gift-card purchases for this wallet yet.');
    }catch(e){setError((e as Error).message);}finally{setRestoring(false);}
  }
  if(!wallet)return <div className="card-orders"><WalletMultiButton/></div>;
  return <section className="card-orders" aria-label="Your gift-card purchases">
    {!focusedId&&<div className="orders-toolbar"><h3>My gift cards</h3><button className="text-button" disabled={restoring||!signMessage} onClick={restore}><RefreshCw size={14} className={restoring?'spin':''}/>{restoring?'Restoring…':'Restore purchases'}</button></div>}
    {orders.length===0&&<p className="orders-empty" role="status">{focusedId?'Loading your purchase…':'No gift cards yet.'}</p>}
    {orders.map(order=><PurchaseCard key={order.id} order={order} onRetry={()=>retry(order.id)}/>)}
    {error&&<p className="secure-note">{error}</p>}
  </section>;
}

function PurchaseCard({order,onRetry}:{order:Order;onRetry:()=>void}){
  const [imageFailed,setImageFailed]=useState(false);
  const failed=order.status==='FAILED',delivered=order.status==='DELIVERED',review=order.status==='REVIEW',quoted=order.status==='QUOTED';
  const instructions=order.details.filter(d=>['How to redeem','Redemption instructions'].includes(d.label));
  const credentials=order.details.filter(d=>!['How to redeem','Redemption instructions'].includes(d.label));
  const status=failed?'Not completed':delivered?'Ready to use':review?'Checking payment':quoted?'Not confirmed':'Processing';
  const charged=order.actualDebitLamports!==null&&BigInt(order.actualDebitLamports)>0n;
  const value=new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency,minimumFractionDigits:Number(order.amount)%1?2:0,maximumFractionDigits:2}).format(Number(order.amount));
  return <article className="purchase-card" aria-label={`${order.brand} ${value} · ${status}`}>
    <div className="purchase-card-header">
      <div className="purchase-art">{order.logo&&!imageFailed?<img src={order.logo} alt={order.brand} referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>:<span>{order.brand.slice(0,1)}</span>}</div>
      <div className="purchase-identity"><h4>{order.brand}</h4><span className={`purchase-status ${failed?'failed':delivered?'ready':''}`}>{failed?<AlertCircle size={13}/>:delivered?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {status}</span></div>
      <span className="purchase-value reward-money"><strong>{value}</strong><SolEquivalent amount={order.amount} currency={order.currency}/></span>
    </div>
    {failed?<div className="purchase-outcome"><span>{charged?'Unused rewards returned':'Rewards returned'}</span><strong>{charged?`${formatRewardSol(order.actualDebitLamports!)} SOL charged`:'No charge'}</strong></div>:review?<p className="purchase-message">We’re checking your payment. Don’t purchase again yet.</p>:quoted?<button className="button secondary full" onClick={onRetry}>Confirm purchase</button>:!delivered?<PurchaseProgress status={order.status}/>:null}
    {delivered&&<div className="purchase-delivery">
      {credentials.map((detail,i)=><CardCredential key={i} detail={detail}/>)}
      {!credentials.length&&<p>Card details sent to your email.</p>}
      {instructions.length>0&&<details className="redemption-instructions"><summary>How to redeem <ChevronDown size={16}/></summary><div>{[...new Set(instructions.map(d=>cardInstructionText(d.value)))].map((text,i)=><p key={i}>{text}</p>)}</div></details>}
    </div>}
    <div className="purchase-meta"><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</time>{!failed&&charged&&<span title={sol(order.actualDebitLamports!)+' SOL'}>{formatRewardSol(order.actualDebitLamports!)} SOL used</span>}<span title={order.id}>#{order.id.slice(0,8).toUpperCase()}</span></div>
  </article>;
}

function CardCredential({detail}:{detail:{label:string;value:string}}){
  const [copied,setCopied]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{if(!copied)return;const timer=setTimeout(()=>setCopied(false),2000);return()=>clearTimeout(timer);},[copied]);
  async function copy(){try{await navigator.clipboard.writeText(detail.value);setCopied(true);setError(false);}catch{setError(true);}}
  return <div className="purchase-credential"><span>{detail.label}</span>{detail.label==='Redemption link'?<a href={detail.value} target="_blank" rel="noreferrer" className="button secondary full">Open gift card ↗</a>:<div className="credential-value"><strong className="gift-card-secret">{detail.value}</strong><button type="button" className="credential-copy" onClick={copy} aria-label={copied?'Copied':('Copy '+detail.label)}>{copied?<Check size={16}/>:<Copy size={16}/>}</button></div>}{error&&<small>Select the code to copy it.</small>}</div>;
}
function PurchaseProgress({status}:{status:string}){
  const stage=status==='PAID'?2:['PAYMENT_READY','PAYMENT_PREPARED'].includes(status)?1:0;
  const labels=['Confirming order','Processing payment','Delivering your card'];
  return <div className="purchase-progress" role="status" aria-live="polite">
    <div className="progress-orb"><Gift size={26}/><span/></div>
    <strong>{labels[stage]}</strong>
    <ol aria-label="Gift card progress">{['Order','Payment','Delivery'].map((label,i)=><li key={label} data-state={i<stage?'done':i===stage?'active':'waiting'}><span>{i<stage?<Check size={13}/>:i===stage?<LoaderCircle size={13} className="spin"/>:i+1}</span>{label}</li>)}</ol>
  </div>;
}
