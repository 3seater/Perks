'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Gift} from 'lucide-react';
import {api} from '@/lib/client';
import {formatRewardSol as sol} from '@/lib/format-rewards';
import {TokenImage} from './token-image';
import {ClaimModal} from './claim-modal';
import {explorerAddress,shortAddress} from './wallet-menu';
import { Skeleton } from './ui/skeleton';
type Amounts={eligibleLamports:string;availableLamports:string;pendingLamports:string;reservedLamports:string;spentLamports:string};
type Balance=Amounts&{syncing:boolean;rewardBps:number;tokens:(Amounts&{tokenMint:string;name:string;symbol:string;imageUrl?:string})[]};
export function WalletRewards({wallet}:{wallet:string}){
  const [balance,setBalance]=useState<Balance|null>(null),[error,setError]=useState(''),[claim,setClaim]=useState(false);
  useEffect(()=>{let active=true;let timer:ReturnType<typeof setTimeout>;setBalance(null);setError('');
    async function refresh(){try{const result=await api<Balance>(`/api/rewards?wallet=${wallet}`);if(active){setBalance(result);setError('');}}catch{if(active)setError('Rewards could not be refreshed. Please try Refresh again.');}finally{if(active)timer=setTimeout(refresh,15000);}}
    void refresh();return()=>{active=false;clearTimeout(timer);};
  },[wallet]);
  if(!balance)return error?<section className="profile-list" aria-label="Trading rewards"><p className="profile-empty" role="alert">{error}</p></section>:<section className="wallet-rewards wallet-rewards-skeleton" aria-label="Loading trading rewards" aria-busy="true"><div className="rewards-overview"><div className="rewards-overview-heading"><Skeleton className="skeleton-rewards-heading"/><Skeleton className="skeleton-rewards-action"/></div><div className="rewards-balances">{Array.from({length:3},(_,index)=><div key={index}><Skeleton className="skeleton-rewards-label"/><Skeleton className="skeleton-rewards-value"/><Skeleton className="skeleton-rewards-copy"/></div>)}</div></div><div className="rewards-breakdown"><div className="rewards-section-heading"><Skeleton className="skeleton-rewards-section"/></div>{Array.from({length:3},(_,index)=><div className="rewards-token-row" key={index}><Skeleton className="skeleton-rewards-token"/><Skeleton className="skeleton-rewards-amount"/><Skeleton className="skeleton-rewards-amount"/></div>)}</div></section>;
  return <section className="wallet-rewards" aria-label="Trading rewards">
    <div className="rewards-overview">
      <div className="rewards-overview-heading"><div><h2>Your trading rewards</h2></div><button className="button primary" onClick={()=>setClaim(true)}><Gift size={16}/>Browse gift cards<ArrowUpRight size={16}/></button></div>
      <dl className="rewards-balances">
        <div className="rewards-total"><dt>Eligible rewards</dt><dd>{sol(balance.eligibleLamports)} <span>SOL</span></dd><p>Available + awaiting collection</p></div>
        <div><dt>Available to spend</dt><dd>{sol(balance.availableLamports)} <span>SOL</span></dd><p>Ready for gift cards</p></div>
        <div><dt>Awaiting collection</dt><dd>{sol(balance.pendingLamports)} <span>SOL</span></dd><p>Earned, with fees yet to be collected</p></div>
      </dl>
    </div>
    <div className="rewards-breakdown">
      <div className="rewards-section-heading"><h3>Rewards by token</h3><span>{balance.tokens.length} {balance.tokens.length===1?'token':'tokens'}</span></div>
      {balance.tokens.length?<div className="rewards-table" role="table" aria-label="Rewards by token">
        <div className="rewards-table-head" role="row"><span role="columnheader">Token</span><span role="columnheader">Available</span><span role="columnheader">Awaiting collection</span><span role="columnheader">Eligible rewards</span></div>
        {balance.tokens.map(token=><div className="rewards-token-row" role="row" key={token.tokenMint}>
          <div role="cell" className="rewards-token-identity"><div className="rewards-token-art"><TokenImage mint={token.tokenMint} source={token.imageUrl} fallback={token.symbol.slice(0,1)||token.name.slice(0,1)}/></div><div><strong title={token.name}>{token.name}</strong><span>{token.symbol&&`$${token.symbol} · `}<a href={explorerAddress(token.tokenMint)} target="_blank" rel="noreferrer" title={token.tokenMint} aria-label={`View ${token.name} on Solana explorer`}>{shortAddress(token.tokenMint)}<ArrowUpRight size={12}/></a></span></div></div>
          <div role="cell" className="rewards-token-amount"><span className="rewards-mobile-label">Available</span>{sol(token.availableLamports)} <small>SOL</small></div>
          <div role="cell" className="rewards-token-amount"><span className="rewards-mobile-label">Awaiting collection</span>{sol(token.pendingLamports)} <small>SOL</small></div>
          <div role="cell" className="rewards-token-amount rewards-token-total"><span className="rewards-mobile-label">Eligible rewards</span>{sol(token.eligibleLamports)} <small>SOL</small></div>
        </div>)}
      </div>:<div className="rewards-empty"><Gift size={25}/><h4>Your first perk starts with a trade.</h4><p>No finalized eligible trades yet.</p><a className="text-button" href="/#curves">Explore tokens<ArrowUpRight size={15}/></a></div>}
    </div>
    <ClaimModal open={claim} onOpenChange={setClaim} demo={false}/>
  </section>;
}
