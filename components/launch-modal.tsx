'use client';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { WalletMultiButton } from './wallet-button';
import { Transaction } from '@solana/web3.js';
import { ArrowUpRight, ImagePlus, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { api } from '@/lib/client';

function LaunchImageField() {
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);
    setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  return <label className="upload-field">
    <span className="launch-image-preview" aria-hidden={!preview}>
      {preview?<img src={preview} alt="Selected coin artwork"/>:<ImagePlus size={26} strokeWidth={1.5} aria-hidden="true"/>}
    </span>
    <span className="launch-image-copy">
      <b>Click anywhere here to choose a file, or drop an image in.</b>
      <span className="launch-file-button">{file?'Change file':'Choose file'}</span>
      <span aria-live="polite">{file?.name??'PNG, JPEG or WebP · up to 4 MB'}</span>
    </span>
    <input type="file" name="image" aria-label="Coin image" accept="image/png,image/jpeg,image/webp" required onChange={event=>setFile(event.target.files?.[0]??null)}/>
  </label>;
}

export function LaunchModal({open,onOpenChange,demo}:{open:boolean;onOpenChange:(value:boolean)=>void;demo:boolean}) {
  const {publicKey,signMessage,signTransaction}=useWallet();
  const [status,setStatus]=useState<{enabled:boolean;pilot:boolean;rewardBps:number|null;reason:string}|null>(null);
  const [prepared,setPrepared]=useState<{mint:string;transaction:string;initialBuyLamports:string;maximumBuyLamports:string;tokenAmount:string;estimatedDebitLamports:string|null;creatorRecipient:string}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  const [canRestart,setCanRestart]=useState(false);
  const [pending,setPending]=useState<{mint:string;signature?:string;transaction?:string}|null>(null);
  const active=useRef(false);
  const address=publicKey?.toBase58(),storageKey=address?`perks-launch:${address}`:null;
  useEffect(()=>{setPrepared(null);setPending(null);setSuccess('');if(storageKey){try{const raw=sessionStorage.getItem(storageKey);if(raw)setPending(JSON.parse(raw));}catch{}}},[storageKey]);
  useEffect(()=>{if(open&&!demo)void api<typeof status>('/api/launch/status').then(setStatus).catch(()=>setStatus(null));},[open,demo]);
  function remember(value:typeof pending){setPending(value);if(storageKey){if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey);}}
  useEffect(()=>{if(open&&pending&&!active.current)void confirm();},[open,pending?.mint]);
  async function confirm() {
    if(active.current)return;
    active.current=true;
    setBusy(true);setError('');setCanRestart(false);
    try{
      let next=pending;
      if(!next){
        if(!prepared||!signTransaction)throw new Error('Connect a wallet that supports signing transactions.');
        const tx=Transaction.from(Uint8Array.from(atob(prepared.transaction),c=>c.charCodeAt(0)));
        if(tx.feePayer?.toBase58()!==address)throw new Error('Reconnect the wallet that prepared this launch.');
        const signed=await signTransaction(tx);
        next={mint:prepared.mint,transaction:btoa(String.fromCharCode(...signed.serialize({requireAllSignatures:false})))};remember(next);
      }
      if(!next.signature){const sent=await api<{signature:string}>('/api/launch/submit',{mint:next.mint,transaction:next.transaction});next={mint:next.mint,signature:sent.signature};remember(next);}
      const deadline=Date.now()+45000;
      while(Date.now()<deadline){
        let response:Response;
        try{response=await fetch('/api/launch/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mint:next.mint,signature:next.signature}),signal:AbortSignal.timeout(8000)});}
        catch{await new Promise(resolve=>setTimeout(resolve,3000));continue;}
        const result=await response.json();
        if(response.ok){setSuccess(next.mint);remember(null);setPrepared(null);window.dispatchEvent(new Event('perks:launched'));return;}
        if(result.status==='failed'||result.status==='expired'){setCanRestart(true);throw new Error(result.error);}
        if(response.status===403)throw new Error(result.error);
        await new Promise(resolve=>setTimeout(resolve,3000));
      }
      setError('Solana has not confirmed this transaction yet. You can close this window; your launch is saved.');
    }catch(e){const message=(e as Error).message;setError(message);if(message.includes('No transaction was submitted.')||message==='The previous launch transaction failed on-chain. Prepare it again.')setCanRestart(true);}finally{active.current=false;setBusy(false);}
  }

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');
    try {
      if(demo){setSuccess('demo');return;}
      if(!publicKey||!signMessage)throw new Error('Connect a wallet that supports signing messages.');
      const form=new FormData(event.currentTarget),image=form.get('image');
      if(!(image instanceof File))throw new Error('Choose an image.');
      const imageHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await image.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
      const challenge=await api<{challengeId:string;message:string}>('/api/launch/challenge',{wallet:publicKey.toBase58(),name:String(form.get('name')).trim(),symbol:String(form.get('symbol')),description:String(form.get('description')).trim(),initialBuySol:String(form.get('initialBuySol')||'0'),imageHash});
      const signature=bs58.encode(await signMessage(new TextEncoder().encode(challenge.message)));
      form.set('wallet',publicKey.toBase58());form.set('challengeId',challenge.challengeId);form.set('signature',signature);
      setPrepared(await api<NonNullable<typeof prepared>>('/api/launch',form));
    }catch(e){setError(e instanceof Error?e.message:'Launch failed.');}finally{setBusy(false);}
  }
  if(pending)return <Dialog className="launch-modal" open={open} onOpenChange={onOpenChange} title={canRestart?'Launch unsuccessful':busy?'Launching your token':'Launch submitted'} description="Solana mainnet">
    <div className="launch-form">
      {busy&&<div className="launch-success"><LoaderCircle className="spin" size={32}/><p>Waiting for Solana confirmation…</p></div>}
      {error&&<p role="alert" className={canRestart?'error-message':'secure-note'}>{error}</p>}
      {pending.signature&&<a className="text-button" href={`https://solscan.io/tx/${pending.signature}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={16}/></a>}
      {canRestart?<button className="button primary full" onClick={()=>{remember(null);setPrepared(null);setError('');setCanRestart(false);}}>Create token</button>:<button className="button primary full" onClick={()=>onOpenChange(false)}>Close</button>}
    </div>
  </Dialog>;
  if(prepared)return <Dialog className="launch-modal" open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}} title="Review your launch" description="Solana mainnet · your wallet approves the transaction.">
    <div className="launch-form">{prepared&&<><div className="launch-info"><span>Initial buy <b>{Number(prepared.initialBuyLamports)/1e9} SOL</b></span><span>Tokens received <b>{(Number(prepared.tokenAmount)/1e6).toLocaleString('en-US',{maximumFractionDigits:6})}</b></span><span>Estimated wallet debit <b>{prepared.estimatedDebitLamports===null?'Unavailable':`${Number(prepared.estimatedDebitLamports)/1e9} SOL`}</b></span></div><p className="secure-note">The estimate includes your buy, account creation and network fees. Your wallet shows the final transaction.</p><p className="secure-note" style={{overflowWrap:'anywhere'}}>Creator-fee treasury: {prepared.creatorRecipient}</p></>}
    {!pending&&prepared&&Number(prepared.initialBuyLamports)>0&&<p className="secure-note">Initial-buy limit: {Number(prepared.maximumBuyLamports)/1e9} SOL, including 1% slippage tolerance. Network fees and account rent are separate.</p>}<button className="button primary full" onClick={confirm} disabled={busy}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowUpRight size={18}/>} {busy?'Checking your launch…':'Approve launch in wallet'}</button>{!pending&&<button className="text-button" disabled={busy} onClick={()=>setPrepared(null)}>Back to details</button>}{error&&<p role="alert" className="error-message">{error}</p>}</div>
  </Dialog>;
  return <Dialog className="launch-modal" open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}} title="Create token" description={demo?'Try the launch form. No token will be created.':'Launch on a Pump.fun curve. Creator fees fund trading rewards.'}>
    {success?<div className="launch-success launch-complete"><CheckCircle2 size={48}/><h3>{success==='demo'?'Looking good. Ready for liftoff.':'Your token is live.'}</h3>{success==='demo'&&<p>This is a demo. Live launches require configured protocol services.</p>}{success!=='demo'&&<a className="button primary" href={`https://pump.fun/coin/${success}`} target="_blank" rel="noreferrer">View Token <ArrowUpRight size={18}/></a>}</div>:<form onSubmit={submit} className="launch-form">
    <div className="form-row"><label>Token name<input name="name" placeholder="Perks" maxLength={32} required/></label><label>Ticker<input name="symbol" placeholder="PERKS" pattern="[A-Za-z0-9]{1,10}" maxLength={10} required/></label></div><label>The story<textarea name="description" placeholder="A short description of the token" maxLength={500} required rows={3}/></label>
    <LaunchImageField/>
    <label>Initial buy in SOL (optional)<input name="initialBuySol" inputMode="decimal" pattern="[0-9]{1,3}(\.[0-9]{1,9})?" defaultValue="0" required/></label>
    <div className="launch-info"><span>Network <b>Solana mainnet</b></span><span>Creator fees <b>Perks treasury → trader rewards</b></span>{status?.rewardBps!==null&&status?.rewardBps!==undefined&&<span>Trader share <b>{status.rewardBps/100}% of the creator fee</b></span>}</div>
    {!demo&&!publicKey?<WalletMultiButton/>:<button className="button primary full" disabled={busy||(!demo&&!status?.enabled)}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowUpRight size={18}/>} {busy?'Preparing your launch…':demo?'Preview launch':'Review launch'}</button>}
    {(demo||status?.enabled||status?.reason!=='The live indexer is catching up. Try again shortly.')&&<p className="secure-note">{demo?'Demo mode · no transaction or network fee':status?.enabled?'Your wallet pays network and creation costs. No added Perks launch fee.':status?.reason||'Checking launch readiness…'}</p>}{error&&<p role="alert" className="error-message">{error}</p>}
    </form>}
  </Dialog>;
}
