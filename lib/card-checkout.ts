import {randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {z} from 'zod';
import {db} from './db';
import {HttpError,live} from './config';
import {encrypt,decrypt} from './crypto';
import {cryptorefills,type Visitor} from './cryptorefills';
import {cryptorefillsOrders,cardOrderBody} from './cryptorefills-orders';
import {countryCode,decimalAmount} from './gift-cards';
import {walletSchema,verifySignature} from './auth';
import {readyCursor} from './rewards';
import {walletRewards,ledgerTransaction,reserveEligibleRewards} from './trade-ledger';
import {integer} from './accounting';
import {maxCardDebit,exactSol,safeCardDetails} from './card-payment-policy';

export const checkoutInput=z.object({wallet:walletSchema,country:countryCode,family:z.string().min(1).max(150),product:z.string().min(1).max(100),amount:decimalAmount,email:z.string().email().max(254)});
export type CheckoutPayload={body:ReturnType<typeof cardOrderBody>;visitor:Visitor;logo?:string};
export const activeCardStates=['QUEUED','CREATING','PAYMENT_READY','PAYMENT_PREPARED','PAID','REVIEW'];
export function visitorFor(request:Request):Visitor{
  const header=process.env.TRUSTED_CLIENT_IP_HEADER,ip=header?request.headers.get(header):null;
  if((ip&&!isIP(ip))||(process.env.NODE_ENV==='production'&&!ip))throw new HttpError(503,'Checkout connection is not configured.');
  return {ip:ip??undefined,userAgent:(request.headers.get('user-agent')??'Perks').slice(0,500)};
}
export async function cardReadiness(){
  if(process.env.CARD_REDEMPTIONS_ENABLED!=='true')return {enabled:false,reason:'Gift-card checkout is being connected.'};
  const worker=await db.paymentWorkerState.findUnique({where:{id:'cards'}});
  if(!worker||worker.publicKey!==process.env.CARD_PAYMENT_PUBLIC_KEY||Date.now()-worker.heartbeatAt.getTime()>90000)return {enabled:false,reason:'Payments are temporarily unavailable. Your rewards are safe.'};
  if(integer(worker.balanceLamports)<=0n)return {enabled:false,reason:'The payment wallet is awaiting funding. Your rewards are safe.'};
  return {enabled:true,reason:''};
}
export async function quoteCard(input:z.infer<typeof checkoutInput>,visitor:Visitor){
  live();const readiness=await cardReadiness();
  if(!readiness.enabled)throw new HttpError(503,readiness.reason);
  await readyCursor();
  const product=(await cryptorefills(visitor).products(input.country,input.family)).find(p=>p.id===input.product);
  if(!product)throw new HttpError(409,'This card is no longer available.');
  const body=cardOrderBody(product,input.amount,input.email);
  const cost=await cryptorefillsOrders(visitor).validate(body);
  if(!cost)throw new HttpError(503,'An exact SOL quote is unavailable. Try again shortly.');
  const feeBudget=BigInt(process.env.CARD_PAYMENT_FEE_CAP_LAMPORTS??'10000');
  const maxDebit=maxCardDebit(cost,feeBudget);
  const limit=BigInt(process.env.CARD_MAX_ORDER_LAMPORTS??'100000000');
  if(maxDebit>limit)throw new HttpError(400,'This card exceeds the current purchase limit. Choose a smaller amount.');
  const rewards=await walletRewards(input.wallet);
  if(maxDebit>rewards.totals.available+rewards.totals.pending)throw new HttpError(409,'Your eligible rewards do not yet cover this card and its payment fee.');
  const id=randomUUID(),expiresAt=new Date(Date.now()+60000);
  const message=`Perks gift-card redemption\nOrder: ${id}\nWallet: ${input.wallet}\nCard: ${product.brand}\nCountry: ${product.country}\nValue: ${input.amount} ${product.currency}\nDeliver to: ${input.email}\nMaximum reward deduction: ${exactSol(maxDebit)} SOL\nIncludes provider price plus network fee and up to 1% price movement. Unused rewards are released.\nExpires: ${expiresAt.toISOString()}\nThis authorizes Perks to pay Cryptorefills and deduct my rewards once. No wallet transfer is requested.`;
  await db.cardCheckout.create({data:{id,walletAddress:input.wallet,brand:product.brand,amount:input.amount,currency:product.currency,message,
    payloadEncrypted:encrypt({body,visitor,logo:product.logo} satisfies CheckoutPayload),maxDebitLamports:maxDebit.toString(),expiresAt}});
  return {id,message,maxDebitLamports:maxDebit.toString(),expiresAt:expiresAt.toISOString()};
}
export async function authorizeCard(id:string,signature:string){
  live();
  const row=await db.cardCheckout.findUniqueOrThrow({where:{id}});
  verifySignature(row.walletAddress,row.message,signature);
  if(row.status!=='QUOTED')return {id:row.id,status:row.status};
  const ready=await cardReadiness();if(!ready.enabled)throw new HttpError(503,ready.reason);
  await readyCursor();
  return ledgerTransaction(async tx=>{
    const current=await tx.cardCheckout.findUniqueOrThrow({where:{id}});
    if(current.status!=='QUOTED')return {id,status:current.status};
    if(current.expiresAt.getTime()<=Date.now())throw new HttpError(409,'Your quote expired. Review the current price again.');
    const worker=await tx.paymentWorkerState.findUniqueOrThrow({where:{id:'cards'}});
    const holds=await tx.cardCheckout.findMany({where:{status:{in:activeCardStates}}});
    const held=holds.reduce((sum,r)=>sum+integer(r.maxDebitLamports),0n);
    if(integer(worker.balanceLamports)<held+integer(current.maxDebitLamports))throw new HttpError(503,'Payments are busy. Your rewards have not been spent. Try again shortly.');
    const outstanding=await tx.cardCheckout.count({where:{walletAddress:row.walletAddress,status:{in:activeCardStates}}});
    if(outstanding)throw new HttpError(409,'Your previous card purchase is still processing.');
    await reserveEligibleRewards(tx,id,row.walletAddress,integer(current.maxDebitLamports));
    await tx.cardCheckout.update({where:{id},data:{status:'QUEUED',authorization:signature}});
    return {id,status:'QUEUED'};
  });
}
export async function readCard(id:string,signature:string){
  const row=await db.cardCheckout.findUniqueOrThrow({where:{id}});
  verifySignature(row.walletAddress,row.message,signature);
  const payload=decrypt<CheckoutPayload>(row.payloadEncrypted);
  const provider=row.providerEncrypted?decrypt<{deliveries?:{deliverable?:{brand_logo?:unknown}}[]}>(row.providerEncrypted):null;
  const image=payload.logo??provider?.deliveries?.[0]?.deliverable?.brand_logo;
  const logo=typeof image==='string'&&image.startsWith('https://cdn.cryptorefills.com/')?image:null;
  return {id:row.id,status:row.status,brand:row.brand,amount:row.amount,currency:row.currency,logo,createdAt:row.createdAt.toISOString(),
    error:row.publicError,actualDebitLamports:row.actualDebitLamports?.toString()??null,
    details:row.status==='DELIVERED'&&row.providerEncrypted?safeCardDetails(decrypt(row.providerEncrypted)):[]};
}

export function historyMessage(wallet:string,issuedAt:number){return `Perks: restore my gift-card purchases\nWallet: ${wallet}\nIssued at: ${issuedAt}\nRead access only. Expires after 5 minutes.`;}
export async function restoreCards(wallet:string,issuedAt:number,signature:string){
  if(!Number.isSafeInteger(issuedAt)||issuedAt>Date.now()+10000||Date.now()-issuedAt>300000)throw new HttpError(401,'Please sign a fresh purchase-history request.');
  verifySignature(wallet,historyMessage(wallet,issuedAt),signature);
  const rows=await db.cardCheckout.findMany({where:{walletAddress:wallet,status:{not:'QUOTED'},authorization:{not:null}},orderBy:{createdAt:'desc'},take:20});
  // Reissue the buyer's existing read capabilities only after wallet proof.
  return {proofs:rows.map(r=>({id:r.id,signature:r.authorization!}))};
}
