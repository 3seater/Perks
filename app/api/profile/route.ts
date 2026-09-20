import { PublicKey } from '@solana/web3.js';
import { db } from '@/lib/db';
import { demo, HttpError } from '@/lib/config';
import { json, route } from '@/lib/http';
import {TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID} from '@solana/spl-token';
import {rpc} from '@/lib/solana';
import {perksPositions} from '@/lib/profile-positions';
import {rateLimit} from '@/lib/redis';
export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  let address: string;
  try { address = new PublicKey(new URL(request.url).searchParams.get('address') || '').toBase58(); }
  catch { throw new HttpError(400, 'Invalid wallet address.'); }
  // Demo tokens are never attributed to a real connected wallet.
  if (demo()) return json({ launches: [],positions:[],errors:[],demo: true });
  await rateLimit(`profile:${address}`,30);
  const launches = await db.token.findMany({where:{creatorWallet:address,status:'ACTIVE'},orderBy:{createdAt:'desc'},select:{mintAddress:true,name:true,symbol:true,imageUrl:true,createdAt:true}});
  const tokens=await db.token.findMany({where:{status:'ACTIVE'},select:{mintAddress:true,name:true,symbol:true,imageUrl:true}});
  let positions:ReturnType<typeof perksPositions>=[],errors:string[]=[];
  if(tokens.length){try{
    const accounts=await Promise.all([TOKEN_PROGRAM_ID,TOKEN_2022_PROGRAM_ID].map(programId=>rpc().getParsedTokenAccountsByOwner(new PublicKey(address),{programId},'finalized')));
    positions=perksPositions(tokens,accounts.flatMap(response=>response.value.map(account=>{const info=account.account.data.parsed.info;return {mint:info.mint,amount:info.tokenAmount.amount,decimals:info.tokenAmount.decimals};})));
  }catch{errors=['Your Perks positions could not be loaded.'];}}
  return json({launches,positions,errors,demo:false});
});
