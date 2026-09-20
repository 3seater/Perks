import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
import {readFile} from 'node:fs/promises';
import {Keypair,PublicKey,SystemProgram,Transaction,type Connection} from '@solana/web3.js';
import bs58 from 'bs58';
import {db} from '../lib/db';
import {rpc} from '../lib/solana';
import {required} from '../lib/config';
import {decrypt,encrypt} from '../lib/crypto';
import {integer} from '../lib/accounting';
import {verifySignature} from '../lib/auth';
import {cryptorefillsOrders} from '../lib/cryptorefills-orders';
import {parseCardPayment,providerState,unpaidTerminal} from '../lib/card-payment-policy';
import {settleCardPayment} from '../lib/card-settlement';
import type {CheckoutPayload} from '../lib/card-checkout';
import type {CardCheckout} from '@prisma/client';
import {automaticCollection} from './automatic-collection';

const feeCap=()=>BigInt(process.env.CARD_PAYMENT_FEE_CAP_LAMPORTS??'10000');
const enabled=()=>process.env.CARD_REDEMPTIONS_ENABLED==='true';
async function failUnpaid(row:CardCheckout,reason:string){
  if(row.signedTransaction)throw new Error('Cannot release a possibly broadcast payment');
  await settleCardPayment(row.id,0n,`unpaid:${reason}:${row.id}`,'FAILED');
}
async function review(id:string){
  await db.cardCheckout.update({where:{id},data:{status:'REVIEW',publicError:'Your purchase needs a payment check. It will not be charged again.'}});
}
export async function processOrder(row:CardCheckout,signer:Keypair,dependencies?:{connection:Connection;provider:ReturnType<typeof cryptorefillsOrders>}){
  const connection=dependencies?.connection??rpc();
  if(!row.authorization)throw new Error('Missing purchase authorization');
  verifySignature(row.walletAddress,row.message,row.authorization);
  const reservation=await db.rewardReservation.findUniqueOrThrow({where:{id:row.id}});
  if(reservation.walletAddress!==row.walletAddress||integer(reservation.amountLamports)!==integer(row.maxDebitLamports))throw new Error('Reservation authorization mismatch');
  if(['QUEUED','CREATING','PAYMENT_READY','PAYMENT_PREPARED'].includes(row.status)&&!['RESERVED','SUBMITTING'].includes(reservation.status))throw new Error('Payment reservation is no longer active');
  const payload=decrypt<CheckoutPayload>(row.payloadEncrypted),provider=dependencies?.provider??cryptorefillsOrders(payload.visitor);
  if(row.status==='QUEUED'){
    if(!enabled())return;
    if(Date.now()-row.expiresAt.getTime()>5*60*1000){await failUnpaid(row,'queue-expired');return;}
    // Recheck cash and daily limits BEFORE creating an order. Other queued
    // orders are processed serially by the database-elected worker.
    const start=new Date();start.setUTCHours(0,0,0,0);
    const paid=await db.cardCheckout.findMany({where:{paymentSignature:{not:null},updatedAt:{gte:start}}});
    const daily=paid.reduce((sum,r)=>sum+integer(r.actualDebitLamports??r.maxDebitLamports),0n);
    if(daily+integer(row.maxDebitLamports)>BigInt(process.env.CARD_MAX_DAILY_LAMPORTS??'500000000')){await failUnpaid(row,'daily-limit');return;}
    if(BigInt(await connection.getBalance(signer.publicKey,'finalized'))<integer(row.maxDebitLamports)){await failUnpaid(row,'cash-unavailable');return;}
    const quote=await provider.validate(payload.body);
    if(!quote||quote+feeCap()>integer(row.maxDebitLamports)){await failUnpaid(row,'price-changed');return;}
    if(!(await db.cardCheckout.updateMany({where:{id:row.id,status:'QUEUED'},data:{status:'CREATING'}})).count)return;
    // No retries around create: the API does not document an idempotency key.
    const raw=await provider.create(payload.body);
    if(!(await db.cardCheckout.updateMany({where:{id:row.id,status:'CREATING'},data:{providerEncrypted:encrypt(raw)}})).count)return;
    let payment:ReturnType<typeof parseCardPayment>;
    try{payment=parseCardPayment(raw);}catch{
      await failUnpaid(row,'invalid-payment-details');return;
    }
    if(payment.lamports+feeCap()>integer(row.maxDebitLamports)){
      await db.cardCheckout.update({where:{id:row.id},data:{providerOrderId:payment.id}});
      await failUnpaid(row,'invoice-price-changed');return;
    }
    await db.cardCheckout.updateMany({where:{id:row.id,status:'CREATING'},data:{status:'PAYMENT_READY',providerOrderId:payment.id,
      paymentAddress:payment.address,paymentLamports:payment.lamports.toString(),paymentExpiresAt:payment.expiresAt}});
    return;
  }
  if(row.status==='CREATING'){
    // A process stopped after entering create. It never persisted a signed
    // payment, so no funds can have left. Do not create another invoice.
    await failUnpaid(row,'interrupted-order-creation');return;
  }
  if(row.status==='PAYMENT_READY'){
    if(!enabled())return;
    if(!row.paymentExpiresAt||row.paymentExpiresAt.getTime()<Date.now()+60000){await failUnpaid(row,'invoice-expired');return;}
    const current=providerState(await provider.status(row.providerOrderId!));
    if(current.order_id!==row.providerOrderId)throw new Error('Order identity mismatch');
    if(unpaidTerminal.has(current.order_state)){await failUnpaid(row,'provider-expired');return;}
    if(!['Created','WaitingForPayment'].includes(current.order_state)){await review(row.id);return;}
    const block=await connection.getLatestBlockhash('finalized');
    const tx=new Transaction({feePayer:signer.publicKey,...block}).add(SystemProgram.transfer({fromPubkey:signer.publicKey,
      toPubkey:new PublicKey(row.paymentAddress!),lamports:integer(row.paymentLamports!)}));
    const fee=(await connection.getFeeForMessage(tx.compileMessage(),'confirmed')).value;
    if(fee===null||BigInt(fee)>feeCap())return;
    const debit=integer(row.paymentLamports!)+BigInt(fee);
    if(debit>integer(row.maxDebitLamports))throw new Error('Payment exceeds signed limit');
    if(BigInt(await connection.getBalance(signer.publicKey,'finalized'))<debit)return;
    tx.sign(signer);
    const simulation=await connection.simulateTransaction(tx);
    if(simulation.value.err){await failUnpaid(row,'simulation-failed');return;}
    // Persist exact signed bytes BEFORE sending. Replays only rebroadcast these.
    await db.cardCheckout.updateMany({where:{id:row.id,status:'PAYMENT_READY',signedTransaction:null},data:{status:'PAYMENT_PREPARED',signedTransaction:tx.serialize().toString('base64'),
      paymentSignature:bs58.encode(tx.signature!),lastValidBlockHeight:block.lastValidBlockHeight,actualDebitLamports:debit.toString()}});
    return;
  }
  if(row.status==='PAYMENT_PREPARED'){
    const status=(await connection.getSignatureStatuses([row.paymentSignature!],{searchTransactionHistory:true})).value[0];
    if(status?.confirmationStatus==='finalized'){
      const receipt=await connection.getTransaction(row.paymentSignature!,{commitment:'finalized',maxSupportedTransactionVersion:0});
      if(!receipt?.meta)return;
      const debit=status.err?BigInt(receipt.meta.fee):integer(row.paymentLamports!)+BigInt(receipt.meta.fee);
      await settleCardPayment(row.id,debit,`solana:${row.paymentSignature}`,status.err?'FAILED':'PAID');return;
    }
    if(status)return;
    if(await connection.getBlockHeight('finalized')>row.lastValidBlockHeight!){await review(row.id);return;}
    if(!enabled())return;
    await connection.sendRawTransaction(Buffer.from(row.signedTransaction!,'base64'),{skipPreflight:false,maxRetries:2});return;
  }
  if(row.status==='PAID'){
    const raw=await provider.status(row.providerOrderId!),state=providerState(raw);
    if(state.order_id!==row.providerOrderId)throw new Error('Delivery identity mismatch');
    if(state.order_state==='Done')await db.cardCheckout.update({where:{id:row.id},data:{status:'DELIVERED',providerEncrypted:encrypt(raw),publicError:null}});
    else if(['Refunded','PaymentFailed','Expired','WaitingForManualAction'].includes(state.order_state))await review(row.id);
  }
  if(row.status==='REVIEW'&&row.paymentSignature){
    // Continue safe reconciliation, but never create another payment.
    const status=(await connection.getSignatureStatuses([row.paymentSignature],{searchTransactionHistory:true})).value[0];
    if(status?.confirmationStatus==='finalized'){
      if(reservation.status==='RESERVED'||reservation.status==='SUBMITTING'){
        const receipt=await connection.getTransaction(row.paymentSignature,{commitment:'finalized',maxSupportedTransactionVersion:0});
        if(receipt?.meta)await settleCardPayment(row.id,status.err?BigInt(receipt.meta.fee):integer(row.paymentLamports!)+BigInt(receipt.meta.fee),`solana:${row.paymentSignature}`,status.err?'FAILED':'PAID');
      }else if(row.providerOrderId){
        const raw=await provider.status(row.providerOrderId),state=providerState(raw);
        if(state.order_id===row.providerOrderId&&state.order_state==='Done')await db.cardCheckout.update({where:{id:row.id},data:{status:'DELIVERED',providerEncrypted:encrypt(raw),publicError:null}});
      }
    }
  }
}
let stop=false;process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
async function main(){
  const keyPath=process.env.CARD_PAYMENT_KEYPAIR_PATH??JSON.parse(await readFile('.secrets/card-worker.json','utf8')).keyPath;
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(keyPath,'utf8'))));
  if(signer.publicKey.toBase58()!==required('CARD_PAYMENT_PUBLIC_KEY'))throw new Error('Payment signer mismatch');
  if(await rpc().getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw new Error('Mainnet RPC required');
  encrypt({check:true}); // Fail before any orders if encrypted storage is unavailable.
  let lastCollection=0;
  while(!stop){
    try{await db.$transaction(async lock=>{
      const [elected]=await lock.$queryRaw<{locked:boolean}[]>`SELECT pg_try_advisory_xact_lock(73482911) AS locked`;
      if(!elected.locked)return;
      const balance=await rpc().getBalance(signer.publicKey,'finalized');
      await db.paymentWorkerState.upsert({where:{id:'cards'},create:{id:'cards',publicKey:signer.publicKey.toBase58(),heartbeatAt:new Date(),balanceLamports:String(balance)},update:{publicKey:signer.publicKey.toBase58(),heartbeatAt:new Date(),balanceLamports:String(balance)}});
      const row=await db.cardCheckout.findFirst({where:{status:{in:['QUEUED','CREATING','PAYMENT_READY','PAYMENT_PREPARED','PAID','REVIEW']}},orderBy:{updatedAt:'asc'}});
      if(row){try{await processOrder(row,signer);}catch{console.error('Card processing deferred',row.id);}
        // Fair polling, including failures; never log provider payloads or secrets.
        await db.cardCheckout.update({where:{id:row.id},data:{updatedAt:new Date()}});
      }
      if(enabled()&&Date.now()-lastCollection>60000){lastCollection=Date.now();try{await automaticCollection(signer);}catch{console.error('Automatic collection deferred');}}
    },{timeout:120000});}catch{console.error('Payment worker reconnecting');}
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
}
if(require.main===module)void main().catch(()=>{console.error('Card payment worker stopped. Check private configuration and connectivity.');process.exitCode=1;}).finally(()=>db.$disconnect());
