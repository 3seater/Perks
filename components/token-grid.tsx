'use client';

import { useEffect, useState } from 'react';
import type { TokenView } from '@/lib/demo';
import {TokenImage} from './token-image';

// Compact Intl formatting differs across Node/browser ICU versions.
function marketCap(value: number) {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  const [divisor, suffix] = magnitude >= 1e12 ? [1e12, 'T'] as const
    : magnitude >= 1e9 ? [1e9, 'B'] as const
    : magnitude >= 1e6 ? [1e6, 'M'] as const
    : magnitude >= 1e3 ? [1e3, 'K'] as const : [1, ''] as const;
  return `${value < 0 ? '-' : ''}$${(magnitude / divisor).toFixed(1).replace(/\.0$/, '')}${suffix}`;
}

function launchAge(createdAt: string, now: number | null) {
  const timestamp = Date.parse(createdAt);
  if (now === null || !Number.isFinite(timestamp)) return '—';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function TokenGrid({ tokens, onSelect }: { tokens: TokenView[]; onSelect: (token: TokenView) => void }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return <div className="token-grid compact-token-grid">{tokens.map(token => {
    const progress = Math.min(100, Math.max(0, token.progress));
    const address = token.mint.length > 14 ? `${token.mint.slice(0, 5)}…${token.mint.slice(-4)}` : token.mint;
    return <button className="token-card compact-token-card" key={token.mint} onClick={() => onSelect(token)}>
      <div className="token-artwork" style={{ backgroundColor: token.color }}>
        <TokenImage mint={token.mint} source={token.imageUrl} fallback={token.glyph}/>
      </div>
      <div className="token-identity"><h3 title={token.name}>{token.name}</h3><span title={token.symbol}>${token.symbol}</span></div>
      <div className="token-marketcap" aria-label={`Market cap: ${token.marketCap === null ? 'unavailable' : marketCap(token.marketCap)}`}>
        <strong>{token.marketCap === null ? '—' : marketCap(token.marketCap)}</strong><span>MC</span>
      </div>
      <div className="token-progress-row"><div className="progress-track" role="progressbar" aria-label="Bonding curve progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div><span>{Number(progress.toFixed(2))}%</span></div>
      <div className="token-meta"><span className="token-ca" title={`Contract address: ${token.mint}`}>CA {address}</span><time dateTime={token.createdAt} title={`Launched ${token.createdAt}`}>{launchAge(token.createdAt, now)}</time></div>
    </button>;
  })}</div>;
}
