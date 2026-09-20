import { z } from 'zod';
import { required, HttpError } from './config';
import {snapshotCache} from './server-cache';
export const SOL = 'So11111111111111111111111111111111111111112';
export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const solPrice = snapshotCache(async () => {
  if(!process.env.JUPITER_API_KEY){
    // Display estimate only. Gift-card settlement must use the provider's SOL quote.
    const response=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_last_updated_at=true',{signal:AbortSignal.timeout(8000),cache:'no-store'});
    if(!response.ok)throw new HttpError(503,'SOL price unavailable.');
    const {solana}=z.object({solana:z.object({usd:z.number().finite().positive(),last_updated_at:z.number().int().positive()})}).parse(await response.json());
    if(Math.abs(Date.now()/1000-solana.last_updated_at)>180)throw new HttpError(503,'SOL price is stale.');
    return BigInt(Math.round(solana.usd*1_000_000));
  }
  const r = await fetch(`https://api.jup.ag/price/v3?ids=${SOL}`, {headers: {'x-api-key': required('JUPITER_API_KEY')}, signal: AbortSignal.timeout(8000), cache: 'no-store'});
  if (!r.ok) throw new HttpError(503, 'Price quote unavailable.');
  const data = z.record(z.object({usdPrice: z.number().positive(), createdAt: z.string().optional(), blockId: z.number()})).parse(await r.json());
  if (!data[SOL]) throw new HttpError(503, 'SOL price unavailable.');
  const { rpc } = await import('./solana');
  if (Math.abs(await rpc().getSlot('confirmed') - data[SOL].blockId) > 150) throw new HttpError(503, 'Price quote is stale.');
  return BigInt(Math.round(data[SOL].usdPrice * 1_000_000));
},30000);
// Returns an unsigned treasury transaction; no hot treasury key is held by the web server.
// Conversion to USDC does not itself top up Reloadly: use its supported funding rail.
export async function treasurySwap(wallet: string, lamports: bigint) {
  if (lamports <= 0n) throw new Error('Invalid swap amount');
  const headers = {'x-api-key': required('JUPITER_API_KEY'), 'Content-Type': 'application/json'};
  const quoteResponse = await fetch(`https://api.jup.ag/swap/v1/quote?inputMint=${SOL}&outputMint=${USDC}&amount=${lamports}&slippageBps=50`, {headers, signal: AbortSignal.timeout(10000)});
  if (!quoteResponse.ok) throw new Error('Swap quote unavailable');
  const quote = await quoteResponse.json();
  if (Number(quote.priceImpactPct) > 0.01) throw new Error('Swap exceeds 1% price impact policy');
  const response = await fetch('https://api.jup.ag/swap/v1/swap', {method:'POST', headers, body: JSON.stringify({quoteResponse: quote, userPublicKey: wallet, wrapAndUnwrapSol: true}), signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Swap construction failed');
  return z.object({swapTransaction: z.string(), lastValidBlockHeight: z.number()}).parse(await response.json());
}
