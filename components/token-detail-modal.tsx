'use client';
import { ArrowUpRight, Gift } from 'lucide-react';
import type { TokenView } from '@/lib/demo';
import { Dialog } from './ui/dialog';
import { TokenImage } from './token-image';

const usd=(value:number|null)=>value===null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:Math.abs(value)<1000?2:0}).format(value);

export function TokenDetailModal({token,demo,onClose,onExplore}:{token:TokenView|null;demo:boolean;onClose:()=>void;onExplore:()=>void}) {
  const progress=Math.max(0,Math.min(100,token?.progress??0));
  return <Dialog className="token-detail-modal" open={!!token} onOpenChange={open=>{if(!open)onClose();}} title={token?.name??'Token'} description={token?`Details for $${token.symbol}`:'Token details'}>
    {token&&<>
      <div className="token-detail-header">
        <div className="token-detail-art"><TokenImage key={token.mint} mint={token.mint} source={token.imageUrl} alt={token.name} fallback={token.glyph}/></div>
        <div className="token-detail-identity">
          <span className="token-detail-symbol">${token.symbol}</span>
          <h2>{token.name}</h2>
          <span className="token-detail-status"><span/>{demo?'Demo token':token.graduated?'Graduated':'On the curve'}</span>
        </div>
      </div>
      {token.description&&<p className="token-detail-story">{token.description}</p>}
      <div className="token-detail-curve">
        <div><span>Bonding curve</span><b>{Number(progress.toFixed(2))}%</b></div>
        <div className="progress-track" role="progressbar" aria-label="Bonding curve progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div>
      </div>
      <dl className="token-detail-metrics">
        <div><dt>Creator fees</dt><dd>{usd(token.pot)}</dd></div>
        <div><dt>24h volume</dt><dd>{usd(token.volume)}</dd></div>
      </dl>
      <div className="token-detail-actions">
        {demo?<p className="secure-note">Illustrative demo token. Trading is unavailable.</p>:<a className="button primary full" href={`https://pump.fun/coin/${token.mint}`} target="_blank" rel="noreferrer">View on Pump.fun <ArrowUpRight size={18}/></a>}
        <button className="button secondary full" onClick={onExplore}><Gift size={17}/>Explore your perks</button>
      </div>
    </>}
  </Dialog>;
}
