'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useWallet,useConnection} from '@solana/wallet-adapter-react';
import {Transaction} from '@solana/web3.js';
import {WalletMenu} from './wallet-menu';
import {PerksWordmark} from './perks-brand';
import {api} from '@/lib/client';
import {Skeleton} from './ui/skeleton';
import {SiteFooter} from './site-footer';
type Status={treasury:string;balanceLamports:string;curveClaimableLamports:string;rewards:{pending:string;available:string;reserved:string;spent:string};solvent:boolean;collectionEnabled:boolean;indexedSlot:string|null;indexedAt:string|null;paymentWallet:string|null;paymentBalanceLamports:string|null;paymentWorkerOnline:boolean;automaticCollection:boolean};
type Prepared={transaction:string;blockhash:string;lastValidBlockHeight:number;feeLamports:number;treasury:string};
const sol=(value:string)=>`${(Number(value)/1e9).toLocaleString('en-US',{maximumFractionDigits:9})} SOL`;
export function TreasuryPanel(){
  const {publicKey,sendTransaction}=useWallet(),{connection}=useConnection();
  const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[prepared,setPrepared]=useState<Prepared|null>(null),[signature,setSignature]=useState('');
  const wallet=publicKey?.toBase58();
  async function refresh(){try{setStatus(await api<Status>('/api/treasury'));setError('');}catch(e){setError((e as Error).message);}}
  useEffect(()=>{void refresh();},[]);
  useEffect(()=>{setPrepared(null);},[wallet]);
  async function prepare(){setBusy(true);setError('');try{setPrepared(await api<Prepared>('/api/treasury/collect',{wallet}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function collect(){
    if(!prepared||wallet!==prepared.treasury)return;
    setBusy(true);setError('');
    try{
      const tx=Transaction.from(Uint8Array.from(atob(prepared.transaction),c=>c.charCodeAt(0)));
      const sig=await sendTransaction(tx,connection);setSignature(sig);setPrepared(null);
      const confirmation=await connection.confirmTransaction({signature:sig,blockhash:prepared.blockhash,lastValidBlockHeight:prepared.lastValidBlockHeight},'finalized');
      if(confirmation.value.err)throw new Error('Collection failed on-chain. No rewards were funded by this transaction.');
      await refresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="site-shell"><header className="nav"><Link className="logo" href="/"><PerksWordmark/></Link><WalletMenu/></header><main className="catalog-page"><h1>Perks treasury</h1><p className="catalog-intro">Collect creator fees into the shared treasury. Rewards become available after the finalized receipt is reconciled.</p>
    {status?<>{status.paymentWallet&&<div className="catalog-quote"><h2>Automatic gift-card payments</h2><p>Fund this wallet with SOL to cover customer purchases. Verified rewards are deducted automatically when it pays.</p><p style={{overflowWrap:'anywhere',userSelect:'all'}}>{status.paymentWallet}</p><div><span>Payment wallet</span><b>{status.paymentBalanceLamports===null?'Checking…':sol(status.paymentBalanceLamports)}</b></div><div><span>Payment worker</span><b>{status.paymentWorkerOnline?'Online':'Offline'}</b></div><div><span>Creator-fee collection</span><b>{status.automaticCollection?'Automatic when funded':'Manual'}</b></div></div>}<p className="catalog-intro" style={{overflowWrap:'anywhere'}}>Treasury: {status.treasury}</p><div className="catalog-quote">
      <div><span>Treasury SOL</span><b>{sol(status.balanceLamports)}</b></div><div><span>Curve fees ready to collect</span><b>{sol(status.curveClaimableLamports)}</b></div>
      <div><span>Pending trader rewards</span><b>{sol(status.rewards.pending)}</b></div><div><span>Available trader rewards</span><b>{sol(status.rewards.available)}</b></div><div><span>Reserved for redemptions</span><b>{sol(status.rewards.reserved)}</b></div>
      <p>{status.indexedSlot?`Indexed through finalized slot ${status.indexedSlot}`:'Indexer has not started.'}</p></div>
      {!status.solvent&&<p role="alert" className="error-message">Treasury SOL is below funded reward liabilities. Payouts must remain paused.</p>}
      <p className="catalog-intro">{wallet!==status.treasury?'Connect the treasury wallet to prepare a collection.':!status.collectionEnabled?'Live fee collection is still disabled while verification is completed.':'Your wallet approves the collection and pays its network fee.'}</p>
      {prepared?<><p>Estimated network fee: {sol(String(prepared.feeLamports))}</p><button className="button primary" disabled={busy} onClick={collect}>{busy?'Waiting for confirmation…':'Approve collection in wallet'}</button></>:<button className="button primary" disabled={busy||wallet!==status.treasury||!status.collectionEnabled} onClick={prepare}>{busy?'Simulating collection…':'Review collection'}</button>}
    </>:<div className="catalog-quote treasury-skeleton" aria-label="Loading treasury status" aria-busy="true">{Array.from({length:5},(_,index)=><div key={index}><Skeleton className="skeleton-treasury-label"/><Skeleton className="skeleton-treasury-value"/></div>)}</div>}
    {signature&&<p className="catalog-intro"><a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">View submitted collection</a>. Reconciliation may still be pending.</p>}
    {error&&<p role="alert" className="error-message">{error}</p>}<button className="text-button" disabled={busy} onClick={refresh}>Refresh status</button>
  </main><SiteFooter/></div>;
}
