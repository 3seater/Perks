'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import '@solana/wallet-adapter-react-ui/styles.css';
export function Providers({children}:{children:ReactNode}) {
  const [walletError, setWalletError] = useState(false);
  const wallets = useMemo(()=>[new PhantomWalletAdapter(),new SolflareWalletAdapter()],[]);
  return <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_SOLANA_RPC_URL || (process.env.NEXT_PUBLIC_SOLANA_NETWORK==='mainnet-beta'?'https://api.mainnet-beta.solana.com':'https://api.devnet.solana.com')}><WalletProvider wallets={wallets} autoConnect onError={()=>setWalletError(true)}><WalletModalProvider>{children}{walletError&&<div className="wallet-error-toast" role="alert">Wallet connection failed or was declined. Open your wallet and try again.<button onClick={()=>setWalletError(false)} aria-label="Dismiss wallet error">×</button></div>}</WalletModalProvider></WalletProvider></ConnectionProvider>;
}
