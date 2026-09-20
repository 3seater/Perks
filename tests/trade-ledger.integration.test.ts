import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Only an explicitly supplied, already-migrated disposable test database is used.
test('PostgreSQL: collection replay, sold-out wallets, competing claims and uncertain payment',
  {skip:!process.env.TEST_DATABASE_URL}, async () => {
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  const {db}=await import('../lib/db');
  const ledger=await import('../lib/trade-ledger');
  const prefix=`test-${randomUUID()}`, wallet=`${prefix}-wallet`;
  const lotId=`${prefix}:CURVE:0`, receiptId=`${prefix}-receipt`;
  const reservationIds=[`${prefix}-card`,`${prefix}-sol`];
  try {
    const earning={signature:prefix,eventIndex:0,venue:'CURVE' as const,slot:1n,
      tokenMint:`${prefix}-mint`,walletAddress:wallet,side:'SELL' as const,feeLamports:1000n,rewardBps:8000};
    await ledger.ledgerTransaction(tx=>ledger.recordEarning(tx,earning));
    await ledger.ledgerTransaction(tx=>ledger.recordEarning(tx,earning));
    assert.equal(await db.rewardLot.count({where:{id:lotId}}),1);
    await assert.rejects(ledger.ledgerTransaction(tx=>ledger.recordEarning(tx,{...earning,feeLamports:2000n})));
    assert.equal((await ledger.walletRewards(wallet)).totals.pending,800n);
    await assert.rejects(ledger.reserveRewardBalance(reservationIds[0],wallet,'CARD',1n));
    const collection={id:receiptId,slot:2n,venue:'CURVE' as const,receivedLamports:1000n,
      evidence:`${prefix}-verified-chain-receipt`,allocations:[{lotId,lamports:1000n}]};
    await assert.rejects(ledger.applyVerifiedCollection({...collection,receivedLamports:999n}));
    await ledger.applyVerifiedCollection(collection);
    await ledger.applyVerifiedCollection(collection);
    // There are no holder checkpoints for this wallet. Selling all does not remove its entitlement.
    assert.equal(await db.userTokenCheckpoint.count({where:{walletAddress:wallet}}),0);
    assert.equal((await ledger.walletRewards(wallet)).totals.available,800n);
    const attempts=await Promise.allSettled([
      ledger.reserveRewardBalance(reservationIds[0],wallet,'CARD',600n),
      ledger.reserveRewardBalance(reservationIds[1],wallet,'SOL',600n)
    ]);
    assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
    const winner=attempts[0].status==='fulfilled'?0:1, id=reservationIds[winner],kind=winner===0?'CARD':'SOL';
    await ledger.reserveRewardBalance(id,wallet,kind,600n);
    assert.equal((await ledger.walletRewards(wallet)).totals.available,200n);
    assert.equal(await ledger.beginRewardPayment(id),true);
    assert.equal(await ledger.beginRewardPayment(id),false);
    // No release occurs merely because a worker has stopped responding.
    assert.equal((await ledger.walletRewards(wallet)).totals.reserved,600n);
    await ledger.finishRewardPayment(id,'SPENT',`${prefix}-payment`);
    await ledger.finishRewardPayment(id,'SPENT',`${prefix}-payment`);
    await assert.rejects(ledger.finishRewardPayment(id,'RELEASED','late timeout'));
    assert.deepEqual((await ledger.walletRewards(wallet)).totals,{pending:0n,available:200n,reserved:0n,spent:600n});
    const releaseId=reservationIds[1-winner];
    await ledger.reserveRewardBalance(releaseId,wallet,'SOL',200n);
    await ledger.finishRewardPayment(releaseId,'RELEASED',`${prefix}-cancelled-before-submit`);
    assert.equal((await ledger.reserveRewardBalance(releaseId,wallet,'SOL',200n)).status,'RELEASED');
    assert.equal((await ledger.walletRewards(wallet)).totals.available,200n);
    await assert.rejects(db.rewardLot.update({where:{id:lotId},data:{reservedLamports:'201'}}));
  } finally {
    await db.rewardAllocation.deleteMany({where:{reservationId:{in:reservationIds}}});
    await db.rewardReservation.deleteMany({where:{id:{in:reservationIds}}});
    await db.rewardFunding.deleteMany({where:{collectionId:receiptId}});
    await db.rewardCollection.deleteMany({where:{id:receiptId}});
    await db.rewardLot.deleteMany({where:{id:lotId}});
    await db.$disconnect();
  }
});

test('PostgreSQL: canonical collection funds earlier same-slot trades once and preserves unmatched receipts',
  {skip:!process.env.TEST_DATABASE_URL},async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  const {db}=await import('../lib/db');
  const ledger=await import('../lib/trade-ledger');
  const prefix=`collection-${randomUUID()}`,lotId=`${prefix}:CURVE:0`,id=`${prefix}:receipt`;
  try{
    await ledger.ledgerTransaction(async tx=>{
      await ledger.recordEarning(tx,{signature:prefix,eventIndex:0,venue:'CURVE',slot:10n,tokenMint:prefix,walletAddress:prefix,side:'SELL',feeLamports:1000n,rewardBps:7500});
      await ledger.fundProvenCollection(tx,10n,{id,venue:'CURVE',receivedLamports:1100n,evidence:prefix});
    });
    await ledger.ledgerTransaction(tx=>ledger.fundProvenCollection(tx,10n,{id,venue:'CURVE',receivedLamports:1100n,evidence:prefix}));
    assert.equal((await ledger.walletRewards(prefix)).totals.available,750n);
    const receipt=await db.rewardCollection.findUniqueOrThrow({where:{id}});
    assert.equal(receipt.allocatedLamports.toString(),'1000');
    assert.equal(receipt.receivedLamports.toString(),'1100');
    await assert.rejects(ledger.ledgerTransaction(tx=>ledger.fundProvenCollection(tx,10n,{id,venue:'CURVE',receivedLamports:1101n,evidence:prefix})));
  }finally{
    await db.rewardFunding.deleteMany({where:{collectionId:id}});
    await db.rewardCollection.deleteMany({where:{id}});
    await db.rewardLot.deleteMany({where:{id:lotId}});
    await db.$disconnect();
  }
});
