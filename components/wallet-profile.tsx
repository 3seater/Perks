'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ExternalLink } from 'lucide-react';
import { PerksWordmark } from './perks-brand';
import { AddressCopy, WalletAvatar, WalletMenu, explorerAddress, shortAddress } from './wallet-menu';
import { api } from '@/lib/client';
import { useWalletUiReady } from './wallet-button';
import {WalletRewards} from './wallet-rewards';
import {TokenImage} from './token-image';
type Launch = { mintAddress: string; name: string; symbol: string; imageUrl: string; createdAt: string };
type Position = { mint: string; amount: string;name:string;symbol:string;imageUrl:string };

export function WalletProfile() {
  const ready = useWalletUiReady();
  const { publicKey, connected } = useWallet();
  const address = ready && connected ? publicKey?.toBase58() : undefined;
  const [tab, setTab] = useState('Positions'), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<{address:string;positions:Position[];launches:Launch[];errors:string[];demo:boolean}|null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!address || !publicKey) { setData(null); return; }
    let cancelled = false;let timer:ReturnType<typeof setTimeout>;
    setLoading(true); setData(null);
    async function load() {
      try{const result=await api<{positions:Position[];launches:Launch[];errors:string[];demo:boolean}>(`/api/profile?address=${address}`);if(!cancelled)setData({...result,address:address!});}
      catch{if(!cancelled)setData(previous=>({address:address!,positions:previous?.positions??[],launches:previous?.launches??[],demo:false,errors:['Profile could not be refreshed. Displayed data may be outdated.']}));}
      finally{if(!cancelled){setLoading(false);timer=setTimeout(load,15000);}}
    }
    void load();
    return () => { cancelled = true;clearTimeout(timer); };
  },[address,publicKey,refresh]);
  const current = data?.address === address ? data : null;
  return <div className="site-shell"><header className="nav"><Link href="/" className="logo" aria-label="Perks home"><PerksWordmark/></Link><nav><Link href="/#curves">Explore Curves</Link></nav><div className="nav-actions"><WalletMenu/></div></header><main className="wallet-profile">
    {!address ? <section className="profile-summary profile-connect"><h1>Your Perks profile</h1><p>Connect your Solana wallet to view your positions and launches.</p><WalletMenu/></section> : <>
      <section className="profile-summary"><WalletAvatar address={address}/><div className="profile-identity"><div className="profile-title"><h1>{shortAddress(address)}</h1><span>You</span></div><div className="profile-address"><AddressCopy address={address}/><a href={explorerAddress(address)} target="_blank" rel="noreferrer" aria-label="View wallet on Solana explorer"><ExternalLink size={16}/></a></div></div></section>
      <div className="profile-tabs"><div className="tabs">{['Positions','Launches','Rewards'].map(name => <button key={name} aria-pressed={tab===name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name}{name!=='Rewards'&&<span>{current ? name==='Positions'?current.positions.length:current.launches.length:'—'}</span>}</button>)}</div><button className="text-button" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>{loading?'Refreshing…':'Refresh'}</button></div>
      {current?.errors.map(error=><p className="profile-error" role="alert" key={error}>{error} Use Refresh to try again.</p>)}
      {tab==='Rewards'?<WalletRewards key={`${address}:${refresh}`} wallet={address}/>:<section className="profile-list" aria-label={tab} aria-busy={loading}>
      {loading || !current ? <p className="profile-empty">Loading your wallet…</p> : tab==='Positions' ? <>
        {current.positions.map(position=><a className="profile-row" href={explorerAddress(position.mint)} target="_blank" rel="noreferrer" key={position.mint}><div className="profile-token-icon"><TokenImage mint={position.mint} source={position.imageUrl}/></div><div><strong>{position.name}</strong><span title={position.mint}>${position.symbol} · {shortAddress(position.mint)}</span></div><div className="profile-row-value"><span>Balance</span><strong title={position.amount}>{position.amount}</strong></div><ExternalLink size={14}/></a>)}
        {!current.positions.length && !current.errors.length && <p className="profile-empty">No Perks coin positions in this wallet yet.</p>}
      </> : <>{current.launches.map(token=><a className="profile-row" href={explorerAddress(token.mintAddress)} target="_blank" rel="noreferrer" key={token.mintAddress}><div className="profile-token-icon"><TokenImage mint={token.mintAddress} source={token.imageUrl}/></div><div><strong>{token.name}</strong><span>${token.symbol} · {shortAddress(token.mintAddress)}</span></div><div className="profile-row-value"><span>Launched</span><strong>{new Date(token.createdAt).toLocaleDateString()}</strong></div><ExternalLink size={14}/></a>)}{!current.launches.length && <p className="profile-empty">{current.demo?'Live launches are disabled in demo mode.':'No Perks launches from this wallet yet.'}</p>}</>}
      </section>}
    </>}
  </main></div>;
}
