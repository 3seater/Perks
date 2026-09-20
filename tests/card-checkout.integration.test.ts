import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Keypair,type Connection} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

test('PostgreSQL: prefunded reservation races, exact settlement and collection never credit twice', {skip:!process.env.TEST_DATABASE_URL},async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  const {db}=await import('../lib/db');
  const ledger=await import('../lib/trade-ledger');
  const {settleCardPayment}=await import('../lib/card-settlement');
  const prefix=randomUUID(),wallet=Keypair.generate().publicKey.toBase58(),ids=[randomUUID(),randomUUID()];
  try{
    await ledger.ledgerTransaction(tx=>ledger.recordEarning(tx,{signature:prefix,eventIndex:0,venue:'CURVE',slot:1n,tokenMint:prefix,walletAddress:wallet,side:'BUY',feeLamports:1000n,rewardBps:9500}));
    const attempts=await Promise.allSettled(ids.map(id=>ledger.ledgerTransaction(async tx=>{
      await ledger.reserveEligibleRewards(tx,id,wallet,700n);
      await tx.cardCheckout.create({data:{id,walletAddress:wallet,brand:'Test',amount:'5',currency:'USD',message:'test',payloadEncrypted:'test',maxDebitLamports:'700',expiresAt:new Date(),status:'PAYMENT_PREPARED'}});
    })));
    assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);
    const id=ids[attempts.findIndex(a=>a.status==='fulfilled')];
    await settleCardPayment(id,650n,'payment-proof','PAID');
    await settleCardPayment(id,650n,'payment-proof','PAID');
    await assert.rejects(settleCardPayment(id,600n,'payment-proof','PAID'));
    let balance=(await ledger.walletRewards(wallet)).totals;
    assert.equal(balance.pending+balance.available,300n);assert.equal(balance.reserved,0n);assert.equal(balance.spent,650n);
    await ledger.applyVerifiedCollection({id:prefix,slot:2n,venue:'CURVE',receivedLamports:1000n,evidence:prefix,allocations:[{lotId:`${prefix}:CURVE:0`,lamports:1000n}]});
    balance=(await ledger.walletRewards(wallet)).totals;
    assert.equal(balance.available,300n);assert.equal(balance.pending,0n);assert.equal(balance.spent,650n);
    await assert.rejects(db.rewardLot.update({where:{id:`${prefix}:CURVE:0`},data:{spentLamports:'951'}}));
  }finally{
    await db.cardCheckout.deleteMany({where:{id:{in:ids}}});await db.rewardAllocation.deleteMany({where:{reservationId:{in:ids}}});await db.rewardReservation.deleteMany({where:{id:{in:ids}}});
    await db.rewardFunding.deleteMany({where:{collectionId:prefix}});await db.rewardCollection.deleteMany({where:{id:prefix}});await db.rewardLot.deleteMany({where:{signature:prefix}});await db.$disconnect();
  }
});

test('PostgreSQL: lost create response releases only unpaid order; persisted payment replays exact bytes', {skip:!process.env.TEST_DATABASE_URL},async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.CARD_REDEMPTIONS_ENABLED='true';process.env.VOUCHER_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
  const {db}=await import('../lib/db'),ledger=await import('../lib/trade-ledger');
  const {encrypt}=await import('../lib/crypto');const {processOrder}=await import('../workers/card-payments');
  const signer=Keypair.generate(),user=Keypair.generate(),prefix=randomUUID(),id=randomUUID();
  const message='Authorized test',signature=bs58.encode(nacl.sign.detached(new TextEncoder().encode(message),user.secretKey));
  let creates=0;const sent:string[]=[];
  const provider={validate:async()=>100n,create:async()=>{creates++;throw new Error('Response lost');},status:async()=>({})};
  const connection={getBalance:async()=>1e9,getSignatureStatuses:async()=>({value:[null]}),getBlockHeight:async()=>1,sendRawTransaction:async(bytes:Buffer)=>{sent.push(bytes.toString('base64'));return 'signature';}} as unknown as Connection;
  try{
    await ledger.ledgerTransaction(async tx=>{
      await ledger.recordEarning(tx,{signature:prefix,eventIndex:0,venue:'CURVE',slot:1n,tokenMint:prefix,walletAddress:user.publicKey.toBase58(),side:'BUY',feeLamports:100000n,rewardBps:9500});
      await ledger.reserveEligibleRewards(tx,id,user.publicKey.toBase58(),20000n);
      await tx.cardCheckout.create({data:{id,walletAddress:user.publicKey.toBase58(),brand:'Test',amount:'5',currency:'USD',message,authorization:signature,payloadEncrypted:encrypt({body:{},visitor:{userAgent:'test'}}),maxDebitLamports:'20000',expiresAt:new Date(),status:'QUEUED'}});
    });
    await assert.rejects(processOrder(await db.cardCheckout.findUniqueOrThrow({where:{id}}),signer,{connection,provider}));
    assert.equal(creates,1);
    await processOrder(await db.cardCheckout.findUniqueOrThrow({where:{id}}),signer,{connection,provider});
    assert.equal(creates,1);assert.equal((await db.rewardReservation.findUniqueOrThrow({where:{id}})).status,'RELEASED');
    // A synthetic persisted transaction verifies retry semantics without any RPC.
    await db.rewardReservation.update({where:{id},data:{status:'RESERVED',resolutionEvidence:null}});
    await db.rewardLot.update({where:{id:`${prefix}:CURVE:0`},data:{reservedLamports:'20000'}});
    const row=await db.cardCheckout.update({where:{id},data:{status:'PAYMENT_PREPARED',paymentSignature:'fake',signedTransaction:Buffer.from('exact signed bytes').toString('base64'),lastValidBlockHeight:10}});
    await processOrder(row,signer,{connection,provider});await processOrder(row,signer,{connection,provider});
    assert.deepEqual(sent,[row.signedTransaction,row.signedTransaction]);assert.equal(creates,1);
  }finally{await db.cardCheckout.deleteMany({where:{id}});await db.rewardAllocation.deleteMany({where:{reservationId:id}});await db.rewardReservation.deleteMany({where:{id}});await db.rewardLot.deleteMany({where:{signature:prefix}});await db.$disconnect();}
});

test('PostgreSQL: automatic checkout pays once, delivers credentials, and returns unused allowance', {skip:!process.env.TEST_DATABASE_URL},async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;process.env.CARD_REDEMPTIONS_ENABLED='true';process.env.VOUCHER_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
  const {db}=await import('../lib/db'),ledger=await import('../lib/trade-ledger');
  const {encrypt,decrypt}=await import('../lib/crypto');const {processOrder}=await import('../workers/card-payments');
  const user=Keypair.generate(),payer=Keypair.generate(),recipient=Keypair.generate(),prefix=randomUUID(),id=randomUUID();
  const message='Authorize exact purchase',authorization=bs58.encode(nacl.sign.detached(new TextEncoder().encode(message),user.secretKey));
  let createCount=0,broadcasts=0,finalized=false;
  const provider={validate:async()=>10000n,create:async()=>{createCount++;return {order_id:prefix,wallet_address:recipient.publicKey.toBase58(),coin_amount:'0.00001',coin:'SOL',network:'Solana',qr_text:recipient.publicKey.toBase58()};},status:async()=>({order_id:prefix,order_state:finalized?'Done':'WaitingForPayment',deliveries:[{deliverable:{pin_code:'TEST-CODE',security_code:'123'}}]})};
  const connection={getBalance:async()=>1e9,getLatestBlockhash:async()=>({blockhash:Keypair.generate().publicKey.toBase58(),lastValidBlockHeight:100}),getFeeForMessage:async()=>({value:5000}),simulateTransaction:async()=>({value:{err:null}}),getSignatureStatuses:async()=>({value:[finalized?{confirmationStatus:'finalized',err:null}:null]}),getBlockHeight:async()=>1,sendRawTransaction:async()=>{broadcasts++;return 'ignored';},getTransaction:async()=>({meta:{fee:5000,err:null}})} as unknown as Connection;
  const advance=async()=>processOrder(await db.cardCheckout.findUniqueOrThrow({where:{id}}),payer,{connection,provider});
  try{
    await ledger.ledgerTransaction(async tx=>{
      await ledger.recordEarning(tx,{signature:prefix,eventIndex:0,venue:'CURVE',slot:1n,tokenMint:prefix,walletAddress:user.publicKey.toBase58(),side:'BUY',feeLamports:100000n,rewardBps:9500});
      await ledger.reserveEligibleRewards(tx,id,user.publicKey.toBase58(),25000n);
      await tx.cardCheckout.create({data:{id,walletAddress:user.publicKey.toBase58(),brand:'Test',amount:'5',currency:'USD',message,authorization,payloadEncrypted:encrypt({body:{},visitor:{userAgent:'test'}}),maxDebitLamports:'25000',expiresAt:new Date(Date.now()+60000),status:'QUEUED'}});
    });
    const queued=await db.cardCheckout.findUniqueOrThrow({where:{id}});
    await advance();assert.equal((await db.cardCheckout.findUniqueOrThrow({where:{id}})).status,'PAYMENT_READY');
    await processOrder(queued,payer,{connection,provider});assert.equal(createCount,1);
    const ready=await db.cardCheckout.findUniqueOrThrow({where:{id}});
    await advance();const prepared=await db.cardCheckout.findUniqueOrThrow({where:{id}});assert.ok(prepared.signedTransaction);assert.equal(broadcasts,0);
    await processOrder(ready,payer,{connection,provider});assert.equal((await db.cardCheckout.findUniqueOrThrow({where:{id}})).signedTransaction,prepared.signedTransaction);
    const {settleCardPayment}=await import('../lib/card-settlement');
    await assert.rejects(settleCardPayment(id,0n,`unpaid:stale:${id}`,'FAILED'));
    await advance();assert.equal(broadcasts,1);finalized=true;
    await advance();assert.equal((await db.cardCheckout.findUniqueOrThrow({where:{id}})).status,'PAID');
    await advance();const done=await db.cardCheckout.findUniqueOrThrow({where:{id}});assert.equal(done.status,'DELIVERED');assert.equal(createCount,1);assert.equal(broadcasts,1);assert.equal(done.actualDebitLamports?.toString(),'15000');
    assert.ok(JSON.stringify(decrypt(done.providerEncrypted!)).includes('TEST-CODE'));assert.ok(!done.providerEncrypted!.includes('TEST-CODE'));
    const balance=(await ledger.walletRewards(user.publicKey.toBase58())).totals;assert.equal(balance.reserved,0n);assert.equal(balance.spent,15000n);assert.equal(balance.pending+balance.available,80000n);
    const {historyMessage,restoreCards,readCard}=await import('../lib/card-checkout');
    const issuedAt=Date.now();
    const historySignature=bs58.encode(nacl.sign.detached(new TextEncoder().encode(historyMessage(user.publicKey.toBase58(),issuedAt)),user.secretKey));
    assert.deepEqual((await restoreCards(user.publicKey.toBase58(),issuedAt,historySignature)).proofs,[{id,signature:authorization}]);
    await assert.rejects(restoreCards(payer.publicKey.toBase58(),issuedAt,historySignature));
    await assert.rejects(restoreCards(user.publicKey.toBase58(),issuedAt-400000,historySignature));
    assert.equal((await readCard(id,authorization)).details[0].value,'TEST-CODE');
    await assert.rejects(readCard(id,historySignature));
  }finally{await db.cardCheckout.deleteMany({where:{id}});await db.rewardAllocation.deleteMany({where:{reservationId:id}});await db.rewardReservation.deleteMany({where:{id}});await db.rewardLot.deleteMany({where:{signature:prefix}});await db.$disconnect();}
});
