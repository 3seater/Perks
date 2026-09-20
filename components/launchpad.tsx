'use client';
import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from './site-header';
import { ArrowRight, ArrowUpRight, Flame, Search, Sparkles, Zap } from 'lucide-react';
import { api } from '@/lib/client';
import { demoTokens, type TokenView } from '@/lib/demo';
import { ClaimModal } from './claim-modal';
import { LaunchModal } from './launch-modal';
import { TokenDetailModal } from './token-detail-modal';
import { SortMenu } from './sort-menu';
import { TokenGrid } from './token-grid';
import { GiftCardHero } from './gift-card-hero';
import { BrandTicker } from './brand-ticker';
import { Skeleton, TokenGridSkeleton } from './ui/skeleton';
import { SiteFooter } from './site-footer';

const usd=(n:number|null)=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:Math.abs(n)<1000?2:0}).format(n);
type Feed={demo:boolean;tokens:TokenView[];stats:{generated:number|null;cards:number;launched:number}};
export function Launchpad({demo}:{demo:boolean}) {
  const [feed,setFeed]=useState<Feed>({demo,tokens:demo?demoTokens:[],stats:{generated:demo?128450:0,cards:demo?4826:0,launched:demo?142:0}});
  const [feedLoading,setFeedLoading]=useState(!demo);
  const [error,setError]=useState(''),[claim,setClaim]=useState(false),[launch,setLaunch]=useState(false),[query,setQuery]=useState(''),[tab,setTab]=useState('New'),[sort,setSort]=useState('newest'),[selected,setSelected]=useState<TokenView|null>(null);
  async function load(){setFeedLoading(true);try{setFeed(await api<Feed>('/api/tokens'));setError('');}catch(e){setError((e as Error).message);}finally{setFeedLoading(false);}}
  useEffect(()=>{const refresh=()=>{void load();};window.addEventListener('perks:launched',refresh);return()=>window.removeEventListener('perks:launched',refresh);},[]);
  useEffect(()=>{setSelected(previous=>previous?feed.tokens.find(token=>token.mint===previous.mint)??previous:null);},[feed.tokens]);
  useEffect(()=>{ let active=true; let initial=true; let timer:ReturnType<typeof setTimeout>; async function refresh(){if(initial)setFeedLoading(true);try{const next=await api<Feed>('/api/tokens');if(active){setFeed(next);setError('');}}catch(e){if(active)setError((e as Error).message);}finally{if(active){if(initial){setFeedLoading(false);initial=false;}if(!demo)timer=setTimeout(refresh,15000);}}} void refresh();return()=>{active=false;clearTimeout(timer);};},[demo]);
  const tokens=useMemo(()=>feed.tokens.filter(t=>`${t.name} ${t.symbol}`.toLowerCase().includes(query.toLowerCase())).filter(t=>tab!=='Graduated'||t.graduated).sort((a,b)=>sort==='newest'?Date.parse(b.createdAt)-Date.parse(a.createdAt):sort==='oldest'?Date.parse(a.createdAt)-Date.parse(b.createdAt):sort==='holders'?(b.holders??-1)-(a.holders??-1):sort==='marketCap'?(b.marketCap??-1)-(a.marketCap??-1):(b.volume??-1)-(a.volume??-1)),[feed.tokens,query,tab,sort]);
  return <div className="site-shell">
    <SiteHeader tokensActive onPerks={()=>setClaim(true)} onLaunch={()=>setLaunch(true)}/>
    <main><section className="hero"><div className="hero-copy"><h1>Your trades<br/>come with <span className="lunch-word">perks.</span></h1><p>Discover tokens. Earn rewards from eligible trades. Put them toward gift cards from brands you love.</p><div className="hero-actions"><button className="button primary" onClick={()=>setClaim(true)}>Find your next perk <ArrowUpRight size={19}/></button><a className="text-button" href="#curves">Explore tokens <ArrowRight size={17}/></a></div></div>
      <GiftCardHero/>
    </section>
    <BrandTicker/>
    <section className="stats" aria-label={demo?'Illustrative demo statistics':'Platform statistics'} aria-busy={feedLoading}><div><span>Coins launched</span><strong>{feedLoading?<Skeleton className="skeleton-stat-value"/>:feed.stats.launched.toLocaleString()}</strong></div><div><span>Total perks generated</span><strong>{feedLoading?<Skeleton className="skeleton-stat-value"/>:usd(feed.stats.generated)}</strong></div><div><span>Gift cards issued</span><strong>{feedLoading?<Skeleton className="skeleton-stat-value"/>:feed.stats.cards.toLocaleString()}</strong></div></section>
    <section id="curves" className="curves"><div className="section-heading"><div><h2>Small coins. <span>Big perks.</span></h2></div></div><div className="market-controls"><div className="tabs" aria-label="Token filter">{['New','Trending','Graduated'].map((t,i)=><button key={t} onClick={()=>{setTab(t);setSort(t==='New'?'newest':'volume');}} className={tab===t?'active':''} aria-pressed={tab===t}>{i===0?<Sparkles size={16}/>:i===1?<Flame size={16}/>:<Zap size={16}/>} {t}</button>)}</div><div className="search-controls"><label className="search-box"><Search size={17}/><input placeholder="Find your next meme…" aria-label="Search tokens" value={query} onChange={e=>setQuery(e.target.value)}/><span>/</span></label><SortMenu value={sort} onChange={setSort}/></div></div>
    {error?<div className="empty-state" role="alert"><h3>Curves are temporarily unavailable.</h3><p>{error}</p><button className="button secondary" onClick={load}>Try again</button></div>:feedLoading?<TokenGridSkeleton/>:<TokenGrid tokens={tokens} onSelect={setSelected}/>}
    {!error&&!feedLoading&&!tokens.length&&<div className="empty-state"><h3>{query?'No memes found.':'The next great meme could be yours.'}</h3><p>{query?'Try another name or ticker.':'Launch a coin to start your first Perks curve.'}</p><button className="button secondary" onClick={()=>query?setQuery(''):setLaunch(true)}>{query?'Clear search':'Launch a Coin'}</button></div>}
    </section>
    <section className="bottom-cta"><div className="cta-mark"><img src="/perks-mark.svg" alt=""/></div><div><h2>Your meme. Their next meal.</h2><p>Launch a coin that brings something to the table.</p></div><button className="button primary" onClick={()=>setLaunch(true)}>Launch a Coin <ArrowUpRight size={19}/></button></section>
    </main><SiteFooter/>
    <ClaimModal open={claim} onOpenChange={setClaim} demo={demo}/><LaunchModal open={launch} onOpenChange={setLaunch} demo={demo}/>
    <TokenDetailModal token={selected} demo={demo} onClose={()=>setSelected(null)} onExplore={()=>{setSelected(null);setClaim(true);}}/>
  </div>;
}
