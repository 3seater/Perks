'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletUiReady, WalletButtonPlaceholder, WalletMultiButton } from './wallet-button';
import { ChevronDown, Copy, Check, AlertCircle, ExternalLink, LogOut, ArrowLeftRight, UserRound } from 'lucide-react';

const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
export const walletNetwork = endpoint.includes('devnet') ? 'Solana devnet' : endpoint.includes('testnet') ? 'Solana testnet' : 'Solana mainnet';
export const shortAddress = (address: string) => `${address.slice(0, 5)}…${address.slice(-4)}`;
export function explorerAddress(address: string) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const cluster = endpoint.includes('devnet') ? '?cluster=devnet' : endpoint.includes('testnet') ? '?cluster=testnet' : '';
  return `https://explorer.solana.com/address/${address}${cluster}`;
}
export function WalletAvatar({ address }: { address: string }) {
  const hue = [...address].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 60 + 185;
  return <div className="wallet-avatar" style={{background:`linear-gradient(135deg,hsl(${hue} 90% 65%),hsl(${hue + 25} 90% 35%))`}}><img src="/perks-mark.svg" alt="Wallet avatar"/></div>;
}
export function AddressCopy({ address }: { address: string }) {
  const [status, setStatus] = useState('');
  useEffect(() => { setStatus(''); }, [address]);
  useEffect(() => { if (!status) return; const timer = setTimeout(() => setStatus(''), 2500); return () => clearTimeout(timer); }, [status]);
  return <button className="address-copy" aria-label={`Copy wallet address ${address}`} title={status || address} onClick={async () => { try { await navigator.clipboard.writeText(address); setStatus('Copied'); } catch { setStatus('Copy unavailable'); } }}><span className="copy-wallet-address">{address}</span>{status === 'Copied' ? <Check size={14} aria-hidden="true"/> : status ? <AlertCircle size={14} aria-hidden="true"/> : <Copy size={14} aria-hidden="true"/>}<span className="sr-only" role="status">{status}</span></button>;
}
export function WalletMenu() {
  const ready = useWalletUiReady();
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false), [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const address = publicKey?.toBase58();
  useEffect(() => { setOpen(false); setError(''); }, [address]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  if (!ready) return <WalletButtonPlaceholder/>;
  if (!connected || !address) return <WalletMultiButton/>;
  return <div className="connected-wallet" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button className="button secondary wallet-trigger" ref={trigger} aria-expanded={open} aria-controls="wallet-popover" onClick={() => setOpen(!open)}><WalletAvatar address={address}/>{shortAddress(address)}<ChevronDown size={14}/></button>
    {open && <div className="wallet-popover" id="wallet-popover"><Link href="/profile" className="button primary full" onClick={() => setOpen(false)}><UserRound size={16}/>My profile</Link><button onClick={() => { setOpen(false); setVisible(true); }}><ArrowLeftRight size={16}/>Change wallet</button><a href={explorerAddress(address)} target="_blank" rel="noreferrer"><ExternalLink size={16}/>View on explorer</a><button className="wallet-disconnect" onClick={async () => { try { await disconnect(); setOpen(false); } catch { setError('Could not disconnect. Try again.'); } }}><LogOut size={16}/>Disconnect</button>{error && <p role="alert">{error}</p>}</div>}
  </div>;
}
