import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PerksWordmark } from './perks-brand';

export function SiteFooter(){
  const year=new Date().getFullYear();
  return <footer className="site-footer">
    <div className="site-footer-main">
      <Link href="/" className="site-footer-brand" aria-label="Perks home"><PerksWordmark/></Link>
      <div className="site-footer-links">
        <section><h2>Explore</h2><Link href="/#curves">Tokens</Link><Link href="/docs#rewards">How rewards work</Link><Link href="/docs#gift-cards">Gift cards</Link><Link href="/docs">Docs</Link></section>
        <section><h2>Product</h2><Link href="/profile">My Perks</Link><Link href="/docs#launching">Launch a token</Link><Link href="/docs#rewards">Claim rewards</Link><Link href="/cards">Browse cards</Link></section>
        <section><h2>Connect</h2><a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter <ArrowUpRight size={13}/></a><a href="mailto:hello@perks.fun">hello@perks.fun</a><Link href="/docs#support">Support</Link></section>
        <section><h2>Legal</h2><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/docs#risk">Risk disclosure</Link></section>
      </div>
    </div>
    <div className="site-footer-bottom"><span>© {year} Perks</span><span>Built on <b>Solana</b></span><span>Rewards are subject to availability.</span></div>
  </footer>;
}
