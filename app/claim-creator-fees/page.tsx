'use client';
import {useEffect,useState} from 'react';
import {useWallet,useConnection} from '@solana/wallet-adapter-react';
import {Transaction} from '@solana/web3.js';
import {WalletMenu} from '@/components/wallet-menu';
import {api} from '@/lib/client';

const recipient='Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK';
type Balance={recipient:string;lamports:string};
type Claim={transaction:string;blockhash:string;lastValidBlockHeight:number;feeLamports:number};
export default function Page(){
  const {publicKey,sendTransaction}=useWallet(),{connection}=useConnection();
  const [balance,setBalance]=useState<Balance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[signature,setSignature]=useState(''),[confirmed,setConfirmed]=useState(false);
  const connected=publicKey?.toBase58()===recipient;
  async function refresh(){try{setBalance(await api<Balance>('/api/creator-fees'));}catch(e){setError((e as Error).message);}}
  useEffect(()=>{void refresh();},[]);
  async function claim(){
    if(!connected||busy)return;
    setBusy(true);setError('');setSignature('');setConfirmed(false);
    try{
      const prepared=await api<Claim>('/api/creator-fees',{wallet:publicKey!.toBase58()});
      const transaction=Transaction.from(Uint8Array.from(atob(prepared.transaction),c=>c.charCodeAt(0)));
      const sig=await sendTransaction(transaction,connection);setSignature(sig);
      const result=await connection.confirmTransaction({signature:sig,blockhash:prepared.blockhash,lastValidBlockHeight:prepared.lastValidBlockHeight},'confirmed');
      if(result.value.err)throw new Error('The claim failed on-chain. Check the transaction details.');
      setConfirmed(true);await refresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="site-shell"><header className="nav"><a href="/" className="logo">Perks</a><WalletMenu/></header><main className="catalog-page"><h1>Claim creator fees</h1><p className="catalog-intro">Collect your pending Pump creator fees directly into your Phantom wallet. Only the Solana network fee applies.</p><div className="catalog-quote"><p>Receiving wallet</p><p style={{overflowWrap:'anywhere'}}>{recipient}</p><h2>{balance?`${(Number(balance.lamports)/1e9).toLocaleString('en-US',{maximumFractionDigits:9})} SOL available`:'Checking fees…'}</h2></div>{!connected&&<p>Connect the receiving wallet above to claim.</p>}<button className="button primary" disabled={!connected||busy||!balance||Number(balance.lamports)===0} onClick={claim}>{busy?'Waiting for wallet / confirmation…':'Claim fees in Phantom'}</button><button className="text-button" disabled={busy} onClick={refresh}>Refresh balance</button>{confirmed&&<p role="status">Claim confirmed. The SOL was sent to your wallet.</p>}{signature&&<p><a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer">View claim transaction</a></p>}{error&&<p role="alert" className="error-message">{error}</p>}</main></div>;
}
