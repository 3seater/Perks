import {z} from 'zod';
import {verifyPreparedLaunch} from '@/lib/launch-transaction';
import {route,origin,json} from '@/lib/http';
import {live,HttpError} from '@/lib/config';
import {redis,rateLimit} from '@/lib/redis';
import {rpc} from '@/lib/solana';
export const POST=route(async request=>{
  origin(request);live('LAUNCHES_ENABLED');
  const input=z.object({mint:z.string().max(44),transaction:z.string().max(2000)}).parse(await request.json());
  const raw=await redis().get(`prepared-launch:${input.mint}`);
  if(!raw)throw new HttpError(409,'This prepared launch expired. Check your wallet history before starting another launch.');
  const prepared=JSON.parse(raw);
  let tx;try{tx=verifyPreparedLaunch(input.transaction,prepared.message,prepared.mintSignature?{publicKey:input.mint,signature:prepared.mintSignature}:undefined);}catch{throw new HttpError(403,'Signed transaction does not match the prepared launch.');}
  await rateLimit(`launch-send:${input.mint}`,10,600);
  const signature=await rpc().sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:3,preflightCommitment:'confirmed'});
  return json({signature});
});
