import {route,json} from '@/lib/http';
import {creatorRecipient,rpc} from '@/lib/solana';
import {db} from '@/lib/db';
import {integer} from '@/lib/accounting';
import {lotBalance} from '@/lib/trade-accounting';
import {creatorVaultPda} from '@pump-fun/pump-sdk';
import {rateLimit} from '@/lib/redis';
export const GET=route(async()=>{
  await rateLimit('treasury:status',12,60);
  const treasury=creatorRecipient(),connection=rpc();
  const [balance,curve,rows,cursor,paymentWorker]=await Promise.all([
    connection.getBalance(treasury,'finalized'),connection.getAccountInfo(creatorVaultPda(treasury),'finalized'),
    db.rewardLot.findMany(),db.chainCursor.findUnique({where:{id:'solana'}}),db.paymentWorkerState.findUnique({where:{id:'cards'}})
  ]);
  const totals={pending:0n,available:0n,reserved:0n,spent:0n};
  for(const row of rows){
    if(!row.walletAddress)continue;
    const lot=lotBalance({fee:integer(row.feeLamports),collected:integer(row.collectedLamports),reserved:integer(row.reservedLamports),spent:integer(row.spentLamports),bps:row.rewardBps});
    for(const key of ['pending','available','reserved','spent'] as const)totals[key]+=lot[key];
  }
  const reserve=curve?await connection.getMinimumBalanceForRentExemption(curve.data.length):0;
  return json({treasury:treasury.toBase58(),balanceLamports:String(balance),curveClaimableLamports:String(Math.max(0,(curve?.lamports??0)-reserve)),
    paymentWallet:process.env.CARD_PAYMENT_PUBLIC_KEY??null,paymentBalanceLamports:paymentWorker?.balanceLamports.toString()??null,
    paymentWorkerOnline:!!paymentWorker&&Date.now()-paymentWorker.heartbeatAt.getTime()<90000,automaticCollection:process.env.AUTO_COLLECTION_ENABLED==='true',
    rewards:Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value.toString()])),
    solvent:BigInt(balance)>=totals.available+totals.reserved,collectionEnabled:process.env.COLLECTIONS_ENABLED==='true',
    indexedSlot:cursor?.slot.toString()??null,indexedAt:cursor?.updatedAt.toISOString()??null});
});
