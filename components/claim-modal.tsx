'use client';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CreditCard, LoaderCircle } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { PerksCardBrand } from './perks-brand';
import { WalletMultiButton } from './wallet-button';
import { api } from '@/lib/client';
import { CardCatalog } from './card-catalog';
import { SolEquivalent } from './reward-money';
import { formatRewardSol } from '@/lib/format-rewards';

type Balance = {eligibleCents:number|null;eligibleLamports:string;syncing:boolean};
export function ClaimModal({open,onOpenChange,demo}:{open:boolean;onOpenChange:(value:boolean)=>void;demo:boolean}) {
  const {publicKey}=useWallet();
  const wallet=publicKey?.toBase58();
  const [balance,setBalance]=useState<Balance|null>(null);
  useEffect(()=>{
    let active=true;let timer:ReturnType<typeof setTimeout>;setBalance(null);
    async function refresh(){
      try{const b=await api<Balance>(`/api/rewards?wallet=${wallet}`);if(active)setBalance(b);}
      catch{if(active)setBalance(previous=>previous?{...previous,syncing:true}:null);}
      finally{if(active)timer=setTimeout(refresh,15000);}
    }
    if(open&&!demo&&wallet)void refresh();
    const updated=()=>{if(open&&!demo&&wallet){clearTimeout(timer);void refresh();}};
    window.addEventListener('perks:rewards-updated',updated);
    return()=>{active=false;clearTimeout(timer);window.removeEventListener('perks:rewards-updated',updated);};
  },[open,demo,wallet]);
  const [browsing,setBrowsing]=useState(false);
  const cents=demo?3275:balance?.eligibleCents;
  const loading=!demo&&!!wallet&&!balance;
  return <Dialog className={`reward-modal ${browsing?"reward-modal-browsing":""}`} open={open} onOpenChange={onOpenChange} title="Spend your rewards" description={demo?'Explore your next perk. Demo balance, real cards.':'Your trading rewards. A little something for you.'}>
    <div className={`reward-flow ${browsing?'is-browsing':'is-overview'}`}>
      {browsing&&<button className="text-button reward-back" onClick={()=>setBrowsing(false)}>← Rewards overview</button>}
      <div className="holo-card reward-balance-card">
        <div className="card-top"><PerksCardBrand/><CreditCard size={23}/></div>
        <span className="eyebrow">{demo?'Your demo balance':'Your eligible rewards'}</span>
        <div className="balance-amounts"><strong className="card-balance" aria-live="polite" aria-busy={loading}>{loading?<span role="status" aria-label="Updating your rewards"><LoaderCircle className="spin" size={32} aria-hidden="true"/></span>:cents==null?balance?`${formatRewardSol(balance.eligibleLamports)} SOL`:'—':`${demo?'':'≈ '}$${(cents/100).toFixed(2)}`}</strong>{demo?<SolEquivalent amount={32.75}/>:balance&&cents!=null&&<small className="sol-equivalent">{formatRewardSol(balance.eligibleLamports)} SOL</small>}</div>
      </div>
      {!demo&&!wallet&&!browsing&&<div className="reward-connect"><span>Connect to see your rewards.</span><WalletMultiButton/></div>}
      {!browsing?<div className="reward-overview"><button className="button primary full" onClick={()=>setBrowsing(true)}>Browse gift cards</button></div>:open&&<CardCatalog embedded/>}
    </div>
  </Dialog>;
}
