'use client';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {PerksWordmark} from './perks-brand';
import {WalletMenu} from './wallet-menu';

export function SiteHeader({onPerks,onLaunch,tokensActive=false}:{onPerks:()=>void;onLaunch:()=>void;tokensActive?:boolean}) {
  return <header className="nav">
    <Link href="/" className="logo" aria-label="Perks home"><PerksWordmark/></Link>
    <nav aria-label="Main navigation">
      <Link href="/#curves" className={tokensActive?'nav-active':undefined} aria-current={tokensActive?'page':undefined}>Tokens</Link>
      <button onClick={onPerks}>My Perks</button>
    </nav>
    <div className="nav-actions"><button className="button nav-launch" onClick={onLaunch}><Plus size={16}/>Create</button><WalletMenu/></div>
  </header>;
}
