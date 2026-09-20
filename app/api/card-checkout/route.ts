import {z} from 'zod';
import {route,json,origin} from '@/lib/http';
import {rateLimit} from '@/lib/redis';
import {cardReadiness,checkoutInput,quoteCard,authorizeCard,readCard,visitorFor,historyMessage,restoreCards} from '@/lib/card-checkout';
import {walletSchema} from '@/lib/auth';
export const runtime='nodejs';
export const GET=route(async request=>{
  const wallet=new URL(request.url).searchParams.get('wallet');
  if(wallet){walletSchema.parse(wallet);const issuedAt=Date.now();return json({issuedAt,message:historyMessage(wallet,issuedAt)});}
  return json(await cardReadiness());
});
export const POST=route(async request=>{
  origin(request);
  const body=await request.json();
  const action=z.enum(['quote','authorize','status','history']).parse(body.action);
  if(action==='history'){
    const input=z.object({wallet:walletSchema,issuedAt:z.number().int(),signature:z.string().max(128)}).parse(body);
    await rateLimit(`card:history:${input.wallet}`,5);
    return json(await restoreCards(input.wallet,input.issuedAt,input.signature));
  }
  if(action==='quote'){
    const input=checkoutInput.parse(body);
    await rateLimit(`card:quote:${input.wallet}`,5);
    return json(await quoteCard(input,visitorFor(request)));
  }
  const proof=z.object({id:z.string().uuid(),signature:z.string().min(1).max(128)}).parse(body);
  await rateLimit(`card:${action}:${proof.id}`,action==='status'?30:5);
  return json(action==='authorize'?await authorizeCard(proof.id,proof.signature):await readCard(proof.id,proof.signature));
});
