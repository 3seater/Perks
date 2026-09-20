'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, Zap, Rocket, Coins, Gift, ShieldCheck, CircleHelp, Mail, Search, ChevronRight, Menu, X } from 'lucide-react';
import { PerksWordmark } from './perks-brand';

const groups = [
  { label: 'Getting started', items: [['Overview', 'overview', BookOpen], ['Quick start', 'quick-start', Zap], ['Launching a token', 'launching', Rocket]] },
  { label: 'Using Perks', items: [['Trading rewards', 'rewards', Coins], ['Gift cards', 'gift-cards', Gift], ['Safety & risk', 'risk', ShieldCheck]] },
  { label: 'Resources', items: [['FAQ', 'faq', CircleHelp], ['Support', 'support', Mail]] },
] as const;

export function DocsLayout({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('overview');
  const [sections, setSections] = useState<{ id: string; title: string; text: string }[]>([]);
  const legal = eyebrow === 'Legal';

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.docs-content section'));
    setSections(elements.map((section, index) => {
      section.id ||= `section-${index}`;
      return { id: section.id, title: section.querySelector('h2,h3')?.textContent || title, text: section.textContent || '' };
    }));
    const update = () => {
      const current = elements.filter(section => section.getBoundingClientRect().top <= 150).at(-1) || elements[0];
      if (current) setActive(current.id);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [title]);

  const results = sections.filter(section => section.text.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="docs-page">
    <a className="docs-skip" href="#docs-content">Skip to content</a>
    <div className="docs-mobile-bar"><Link href="/" className="docs-brand"><PerksWordmark /></Link><button aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="docs-sidebar" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
    <aside id="docs-sidebar" className={`docs-sidebar${open ? ' is-open' : ''}`}>
      <Link href="/" className="docs-brand" aria-label="Perks home"><PerksWordmark /></Link>
      <div className="docs-search"><Search size={15} aria-hidden="true" /><input aria-label="Search documentation" placeholder="Search docs..." value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={13} /></button>}</div>
      {query.trim() ? <nav className="docs-search-results" aria-label="Search results"><p className="docs-nav-label" role="status">{results.length} results</p>{results.map(result => <a key={result.id} href={`#${result.id}`} onClick={() => { setOpen(false); setQuery(''); }}>{result.title}<ChevronRight size={13} /></a>)}{!results.length && <p className="docs-search-empty">No matching guides. Try “rewards”, “email”, or “wallet”.</p>}</nav> : <nav aria-label="Documentation">{groups.map(group => <div className="docs-nav-group" key={group.label}><p className="docs-nav-label">{group.label}</p>{group.items.map(([label, id, Icon]) => <a key={id} href={`${legal ? '/docs' : ''}#${id}`} aria-current={!legal && active === id ? 'location' : undefined} onClick={() => setOpen(false)}><Icon size={15} strokeWidth={1.6} />{label}{!legal && active === id && <ChevronRight className="docs-nav-chevron" size={13} />}</a>)}</div>)}</nav>}
    </aside>
    <main className="docs-main" id="docs-content" tabIndex={-1}><article className="docs-content"><p className="docs-kicker">{eyebrow}</p><h1>{title}</h1>{children}</article><aside className="docs-toc" aria-label="On this page"><p>On this page</p>{sections.map(section => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? 'location' : undefined}>{section.title}</a>)}</aside></main>
  </div>;
}
