'use client';
import { useEffect, useMemo, useState } from 'react';
import { WalletMenu } from './wallet-menu';
import { ArrowRight, ArrowUpRight, Flame, Gift, Globe, Plus, Search, Sparkles, Zap } from 'lucide-react';
import { api } from '@/lib/client';
import { demoTokens, type TokenView } from '@/lib/demo';
import { ClaimModal } from './claim-modal';
import { LaunchModal } from './launch-modal';
import { TokenDetailModal } from './token-detail-modal';
import { PerksWordmark, PerksCardBrand } from './perks-brand';
import { SortMenu } from './sort-menu';
import { TokenGrid } from './token-grid';

const usd=(n:number|null)=>n===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:Math.abs(n)<1000?2:0}).format(n);
type Feed={demo:boolean;tokens:TokenView[];stats:{generated:number|null;cards:number;launched:number}};
export function Launchpad({demo}:{demo:boolean}) {
  const [feed,setFeed]=useState<Feed>({demo,tokens:demo?demoTokens:[],stats:{generated:demo?128450:0,cards:demo?4826:0,launched:demo?142:0}});
  const [error,setError]=useState(''),[claim,setClaim]=useState(false),[launch,setLaunch]=useState(false),[query,setQuery]=useState(''),[tab,setTab]=useState('New'),[sort,setSort]=useState('newest'),[selected,setSelected]=useState<TokenView|null>(null);
  async function load(){try{setFeed(await api<Feed>('/api/tokens'));setError('');}catch(e){setError((e as Error).message);}}
  useEffect(()=>{const refresh=()=>{void load();};window.addEventListener('perks:launched',refresh);return()=>window.removeEventListener('perks:launched',refresh);},[]);
  useEffect(()=>{setSelected(previous=>previous?feed.tokens.find(token=>token.mint===previous.mint)??previous:null);},[feed.tokens]);
  useEffect(()=>{ let active=true; let timer:ReturnType<typeof setTimeout>; async function refresh(){try{const next=await api<Feed>('/api/tokens');if(active){setFeed(next);setError('');}}catch(e){if(active)setError((e as Error).message);}finally{if(active&&!demo)timer=setTimeout(refresh,15000);}} void refresh();return()=>{active=false;clearTimeout(timer);};},[demo]);
  const tokens=useMemo(()=>feed.tokens.filter(t=>`${t.name} ${t.symbol}`.toLowerCase().includes(query.toLowerCase())).filter(t=>tab!=='Graduated'||t.graduated).sort((a,b)=>sort==='newest'?Date.parse(b.createdAt)-Date.parse(a.createdAt):sort==='oldest'?Date.parse(a.createdAt)-Date.parse(b.createdAt):sort==='holders'?(b.holders??-1)-(a.holders??-1):sort==='marketCap'?(b.marketCap??-1)-(a.marketCap??-1):(b.volume??-1)-(a.volume??-1)),[feed.tokens,query,tab,sort]);
  return <div className="site-shell">
    <header className="nav"><a href="/" className="logo" aria-label="Perks home"><PerksWordmark/></a><nav aria-label="Main navigation"><a href="#curves" className="nav-active">Explore Curves</a><button onClick={()=>setClaim(true)}>My Perks <span className="new-tag">REWARDS</span></button></nav><div className="nav-actions"><button className="button nav-launch" onClick={()=>setLaunch(true)}><Plus size={16}/> Launch a Coin</button><WalletMenu/></div></header>
    <main><section className="hero"><div className="hero-copy"><h1>The meme launchpad<br/>that pays your <span className="lunch-word">lunch.<svg viewBox="0 0 350 20" aria-hidden="true"><path d="M4 13 Q165 -5 340 9 M10 18 Q160 4 315 15"/></svg></span></h1><p>Launch tokens on Pump.fun bonding curves. Trading fees automatically fund digital gift cards for traders.</p><div className="hero-actions"><button className="button primary" onClick={()=>setClaim(true)}>Find your next perk <ArrowUpRight size={19}/></button><a className="text-button" href="#curves">Explore the curves <ArrowRight size={17}/></a></div></div>
      <div className="hero-art" aria-label="Perks holographic gift card illustration"><div className="orbital orbit-one"/><div className="orbital orbit-two"/><span className="star star-one">✦</span><span className="star star-two">✧</span><div className="floating-label label-top"><span className="live-dot"/> YOUR BAGS HAVE BENEFITS</div><div className="back-card"><span>TRADE. EARN. REPEAT.</span></div><div className="hero-credit-card"><div className="card-top"><PerksCardBrand/><Globe size={29}/></div><div className="chip"><i/><i/><i/></div><div className="hero-card-title">Good memes.<br/>Great taste.</div><div className="card-bottom"><span>THE INTERNET OWES YOU LUNCH.</span><b>✦</b></div></div><div className="floating-label label-bottom"><span className="reward-icon"><Gift size={18}/></span><div><b>Every trade can earn a little back.</b><span>From on-chain to on the house.</span></div><ArrowUpRight size={17}/></div><span className="art-caption mono">001 / MORE THAN A MEME</span></div>
    </section>
    <section className="stats" aria-label={demo?'Illustrative demo statistics':'Platform statistics'}><div><span>Coins launched</span><strong>{feed.stats.launched.toLocaleString()}</strong></div><div><span>Total perks generated</span><strong>{usd(feed.stats.generated)}</strong></div><div><span>Gift cards issued</span><strong>{feed.stats.cards.toLocaleString()}</strong></div></section>
    <div className="merchant-strip"><b className="merchant-extra"><img src="/brands/spotify.svg" alt=""/>Spotify</b><b className="merchant-doordash">▰ DoorDash</b><b>Uber <span className="eats">Eats</span></b><b className="amazon-word">amazon<span>⌣</span></b><b className="steam-word">◉ STEAM</b><b className="merchant-extra merchant-playstation"><img src="/brands/playstation.svg" alt=""/>PlayStation</b></div>
    <section id="curves" className="curves"><div className="section-heading"><div><h2>Small coins. <span>Big perks.</span></h2></div></div><div className="market-controls"><div className="tabs" aria-label="Token filter">{['New','Trending','Graduated'].map((t,i)=><button key={t} onClick={()=>{setTab(t);setSort(t==='New'?'newest':'volume');}} className={tab===t?'active':''} aria-pressed={tab===t}>{i===0?<Sparkles size={16}/>:i===1?<Flame size={16}/>:<Zap size={16}/>} {t}</button>)}</div><div className="search-controls"><label className="search-box"><Search size={17}/><input placeholder="Find your next meme…" aria-label="Search tokens" value={query} onChange={e=>setQuery(e.target.value)}/><span>/</span></label><SortMenu value={sort} onChange={setSort}/></div></div>
    {error?<div className="empty-state" role="alert"><h3>Curves are temporarily unavailable.</h3><p>{error}</p><button className="button secondary" onClick={load}>Try again</button></div>:<TokenGrid tokens={tokens} onSelect={setSelected}/>}
    {!error&&!tokens.length&&<div className="empty-state"><h3>{query?'No memes found.':'The next great meme could be yours.'}</h3><p>{query?'Try another name or ticker.':'Launch a coin to start your first Perks curve.'}</p><button className="button secondary" onClick={()=>query?setQuery(''):setLaunch(true)}>{query?'Clear search':'Launch a Coin'}</button></div>}
    </section>
    <section className="bottom-cta"><div className="cta-mark"><img src="/perks-mark.svg" alt=""/></div><div><h2>Your meme. Their next meal.</h2><p>Launch a coin that brings something to the table.</p></div><button className="button primary" onClick={()=>setLaunch(true)}>Launch a Coin <ArrowUpRight size={19}/></button></section>
    </main><footer><a href="/" className="logo"><PerksWordmark/></a><span aria-hidden="true"/><span className="mono">BUILT ON <b>≋ SOLANA</b></span><span>© {new Date().getFullYear()} Perks</span></footer>
    <ClaimModal open={claim} onOpenChange={setClaim} demo={demo}/><LaunchModal open={launch} onOpenChange={setLaunch} demo={demo}/>
    <TokenDetailModal token={selected} demo={demo} onClose={()=>setSelected(null)} onExplore={()=>{setSelected(null);setClaim(true);}}/>
  </div>;
}
