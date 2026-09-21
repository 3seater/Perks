import { z } from 'zod';
import { route, origin, json } from '@/lib/http';
import { live, HttpError } from '@/lib/config';
import { db } from '@/lib/db';
import { verifyLaunch } from '@/lib/pump';
import {rpc} from '@/lib/solana';
import {redis} from '@/lib/redis';
import {decrypt} from '@/lib/crypto';
import {Message} from '@solana/web3.js';
export const POST = route(async request => {
  origin(request); live('LAUNCHES_ENABLED');
  const input = z.object({mint:z.string().min(32).max(44),signature:z.string().min(64).max(90)}).parse(await request.json());
  const token = await db.token.findUnique({where:{mintAddress:input.mint}});
  if (!token) throw new HttpError(404,'Launch not found.');
  const status=(await rpc().getSignatureStatuses([input.signature],{searchTransactionHistory:true})).value[0];
  if(status?.err)return json({status:'failed',error:'The transaction failed on Solana. You can start a new launch.'},409);
  if(status?.confirmationStatus!=='finalized'){
    const raw=await redis().get(`submitted-launch:${input.mint}`);
    const receipt=raw?decrypt<{signature:string;blockhash:string;transaction:string}>(raw):null;
    if(receipt&&receipt.signature!==input.signature)throw new HttpError(403,'Transaction does not match this launch.');
    const preparedRaw=await redis().get(`prepared-launch:${input.mint}`);
    const blockhash=receipt?.blockhash||(preparedRaw?Message.from(Buffer.from(JSON.parse(preparedRaw).message,'base64')).recentBlockhash:null);
    if(!status&&blockhash&&!(await rpc().isBlockhashValid(blockhash,{commitment:'confirmed'})).value){
      // Re-read after the expiry check to avoid racing a transaction that just landed.
      const latest=(await rpc().getSignatureStatuses([input.signature],{searchTransactionHistory:true})).value[0];
      if(!latest)return json({status:'expired',error:'The transaction expired before reaching Solana. You can start a new launch.'},410);
    }
    if(receipt&&await redis().set(`launch-broadcast:${input.mint}`,'1','EX',5,'NX')){
      try{await rpc().sendRawTransaction(Buffer.from(receipt.transaction,'base64'),{skipPreflight:false,maxRetries:20,preflightCommitment:'confirmed'});}catch{console.warn('Launch rebroadcast pending.');}
    }
    return json({status:'pending',error:'Waiting for Solana confirmation.'},409);
  }
  const verified = await verifyLaunch(input.mint,token.creatorWallet,input.signature,token);
  // Indexer observes the creation in canonical order and activates it. Never skip past creation.
  await db.token.update({where:{mintAddress:input.mint},data:{launchSignature:input.signature,launchSlot:BigInt(verified.slot),totalSupply:verified.supply}});
  return json({mint:input.mint,status:token.status,signature:input.signature});
});
