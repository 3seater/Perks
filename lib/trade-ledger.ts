import { Prisma } from '@prisma/client';
import { db } from './db';
import { integer } from './accounting';
import { allocateAvailable, lotBalance, rewardShare } from './trade-accounting';
import type {CollectionProof} from './collection-proof';

type Tx = Prisma.TransactionClient;
export const ledgerLock = (tx: Tx) => tx.$executeRaw`SELECT pg_advisory_xact_lock(73482910)`;
export async function ledgerTransaction<T>(fn:(tx:Tx)=>Promise<T>):Promise<T>{
  // These callbacks contain database work only. Serializable conflicts may be
  // retried after rollback; external provider/payment actions stay outside.
  for(let attempt=0;;attempt++){
    try{return await db.$transaction(async tx=>{await ledgerLock(tx);return fn(tx);},{isolationLevel:'Serializable',timeout:15000});}
    catch(error){
      if(!(error instanceof Prisma.PrismaClientKnownRequestError)||error.code!=='P2034'||attempt>=4)throw error;
      await new Promise(resolve=>setTimeout(resolve,25*(attempt+1)));
    }
  }
}

// Called inside the checkout transaction: reserving earnings and enqueueing the
// payment must either both commit or neither commit.
export async function reserveEligibleRewards(tx:Tx,id:string,walletAddress:string,amount:bigint) {
  const old=await tx.rewardReservation.findUnique({where:{id}});
  if(old)throw new Error('Reservation already exists');
  const rows=await tx.rewardLot.findMany({where:{walletAddress},orderBy:[{slot:'asc'},{id:'asc'}]});
  const allocations=allocateAvailable(rows.map(row=>{const b=amounts(row);return {id:row.id,available:b.pending+b.available};}),amount);
  for(const a of allocations)await tx.rewardLot.update({where:{id:a.lotId},data:{reservedLamports:{increment:a.lamports.toString()}}});
  return tx.rewardReservation.create({data:{id,walletAddress,kind:'CARD',amountLamports:amount.toString(),allocations:{create:allocations.map(a=>({...a,lamports:a.lamports.toString()}))}}});
}

export type Earning = {
  signature: string; eventIndex: number; venue: 'CURVE' | 'AMM'; slot: bigint;
  tokenMint: string; walletAddress: string | null; side: 'BUY' | 'SELL';
  feeLamports: bigint; rewardBps: number;
};
// Caller must hold ledgerLock and supply authenticated finalized protocol events.
export async function recordEarning(tx: Tx, e: Earning) {
  rewardShare(e.feeLamports, e.rewardBps);
  const id = `${e.signature}:${e.venue}:${e.eventIndex}`;
  const old = await tx.rewardLot.findUnique({where:{id}});
  if (old) {
    if (old.tokenMint !== e.tokenMint || old.walletAddress !== e.walletAddress || old.side !== e.side ||
        old.slot !== e.slot || integer(old.feeLamports) !== e.feeLamports || old.rewardBps !== e.rewardBps)
      throw new Error('Conflicting trade replay');
    return old;
  }
  return tx.rewardLot.create({data:{...e,id,feeLamports:e.feeLamports.toString(),
    attribution:e.walletAddress ? 'PROTOCOL_USER_SIGNER' : 'UNRESOLVED'}});
}

function amounts(row: {feeLamports: Prisma.Decimal; collectedLamports: Prisma.Decimal;
  reservedLamports: Prisma.Decimal; spentLamports: Prisma.Decimal; rewardBps: number}) {
  return lotBalance({fee:integer(row.feeLamports),collected:integer(row.collectedLamports),
    reserved:integer(row.reservedLamports),spent:integer(row.spentLamports),bps:row.rewardBps});
}

export async function walletRewards(walletAddress: string) {
  const rows = await db.rewardLot.findMany({where:{walletAddress},orderBy:[{slot:'asc'},{id:'asc'}]});
  const totals = {pending:0n,available:0n,reserved:0n,spent:0n};
  const tokens = new Map<string, typeof totals>();
  for (const row of rows) {
    const balance = amounts(row), token = tokens.get(row.tokenMint) ?? {pending:0n,available:0n,reserved:0n,spent:0n};
    for (const key of ['pending','available','reserved','spent'] as const) {
      totals[key] += balance[key]; token[key] += balance[key];
    }
    tokens.set(row.tokenMint,token);
  }
  return {totals,tokens:[...tokens].map(([tokenMint,balance])=>({tokenMint,...balance}))};
}

export async function reserveRewardBalance(id: string, walletAddress: string, kind: 'CARD'|'SOL', amount: bigint) {
  if (!id || !walletAddress || !['CARD','SOL'].includes(kind) || amount <= 0n) throw new Error('Invalid reservation');
  return ledgerTransaction(async tx => {
    const old = await tx.rewardReservation.findUnique({where:{id},include:{allocations:true}});
    if (old) {
      if (old.walletAddress !== walletAddress || old.kind !== kind || integer(old.amountLamports) !== amount)
        throw new Error('Reservation identifier reused with different intent');
      return old; // Includes terminal status: retry never resurrects a released/spent reservation.
    }
    const rows = await tx.rewardLot.findMany({where:{walletAddress},orderBy:[{slot:'asc'},{id:'asc'}]});
    const allocations = allocateAvailable(rows.map(row=>({id:row.id,available:amounts(row).available})),amount);
    for (const a of allocations) await tx.rewardLot.update({where:{id:a.lotId},data:{reservedLamports:{increment:a.lamports.toString()}}});
    return tx.rewardReservation.create({data:{id,walletAddress,kind,amountLamports:amount.toString(),
      allocations:{create:allocations.map(a=>({...a,lamports:a.lamports.toString()}))}},include:{allocations:true}});
  });
}

// Payment workers call BEFORE any external mutation. A crash stays reserved.
export async function beginRewardPayment(id: string) {
  return ledgerTransaction(async tx => (await tx.rewardReservation.updateMany({
    where:{id,status:'RESERVED'},data:{status:'SUBMITTING'}})).count === 1);
}

// Internal settlement boundary only: evidence comes from payment reconciliation,
// never a browser's claim that a payment failed/succeeded. No public route exposes it.
export async function finishRewardPayment(id: string, outcome: 'SPENT'|'RELEASED', evidence: string) {
  if (!evidence.trim() || !['SPENT','RELEASED'].includes(outcome)) throw new Error('Settlement evidence required');
  return ledgerTransaction(async tx => {
    const r = await tx.rewardReservation.findUniqueOrThrow({where:{id},include:{allocations:true}});
    if (r.status === outcome) {
      if (r.resolutionEvidence !== evidence) throw new Error('Conflicting settlement replay');
      return r;
    }
    if (!['RESERVED','SUBMITTING'].includes(r.status)) throw new Error('Reservation is already resolved');
    if (outcome === 'SPENT' && r.status !== 'SUBMITTING') throw new Error('Payment was not started');
    if (r.allocations.reduce((sum,a)=>sum+integer(a.lamports),0n) !== integer(r.amountLamports)) throw new Error('Reservation audit mismatch');
    for (const a of r.allocations) {
      const row = await tx.rewardLot.findUniqueOrThrow({where:{id:a.lotId}});
      if (integer(row.reservedLamports) < integer(a.lamports)) throw new Error('Invalid reservation allocation');
      await tx.rewardLot.update({where:{id:a.lotId},data:{reservedLamports:{decrement:a.lamports},
        ...(outcome==='SPENT' ? {spentLamports:{increment:a.lamports}} : {})}});
    }
    return tx.rewardReservation.update({where:{id},data:{status:outcome,resolutionEvidence:evidence,
      ...(outcome==='SPENT' ? {settlementReference:evidence} : {})}});
  });
}

export type VerifiedCollection = {
  id: string; slot: bigint; venue: 'CURVE'|'AMM'; receivedLamports: bigint; evidence: string;
  allocations: {lotId: string; lamports: bigint}[];
};

// Called only inside the canonical finalized-block transaction, after earlier
// trades and before later transactions. Same-slot earlier trades are thus safe.
export async function fundProvenCollection(tx:Tx,slot:bigint,proof:CollectionProof){
  const old=await tx.rewardCollection.findUnique({where:{id:proof.id}});
  if(old){
    if(old.slot!==slot||old.evidence!==proof.evidence||old.venue!==proof.venue||integer(old.receivedLamports)!==proof.receivedLamports)throw new Error('Conflicting collection proof');
    return old;
  }
  if(proof.receivedLamports<=0n)throw new Error('Empty collection proof');
  const lots=await tx.rewardLot.findMany({where:{venue:proof.venue,slot:{lte:slot}},orderBy:[{slot:'asc'},{id:'asc'}]});
  let remaining=proof.receivedLamports;
  const funding:{lotId:string;lamports:string}[]=[];
  for(const lot of lots){
    const outstanding=integer(lot.feeLamports)-integer(lot.collectedLamports);
    const amount=outstanding<remaining?outstanding:remaining;
    if(amount<=0n)continue;
    await tx.rewardLot.update({where:{id:lot.id},data:{collectedLamports:{increment:amount.toString()}}});
    funding.push({lotId:lot.id,lamports:amount.toString()});remaining-=amount;
    if(remaining===0n)break;
  }
  return tx.rewardCollection.create({data:{...proof,slot,receivedLamports:proof.receivedLamports.toString(),allocatedLamports:(proof.receivedLamports-remaining).toString(),funding:{create:funding}}});
}
// No automatic/public caller yet. A chain verifier must prove actual receipt into
// the configured vault AND attribution/watermark before invoking this boundary.
// Keeping this disconnected is deliberate: an RPC balance is not provenance.
export async function applyVerifiedCollection(c: VerifiedCollection) {
  if (!c.id || !c.evidence.trim() || c.receivedLamports <= 0n || !['CURVE','AMM'].includes(c.venue)) throw new Error('Invalid collection');
  const sorted = [...c.allocations].sort((a,b)=>a.lotId.localeCompare(b.lotId));
  if (new Set(sorted.map(a=>a.lotId)).size !== sorted.length || sorted.some(a=>a.lamports<=0n)) throw new Error('Invalid collection allocation');
  const allocated = sorted.reduce((sum,a)=>sum+a.lamports,0n);
  if (allocated > c.receivedLamports) throw new Error('Allocation exceeds received fees');
  return ledgerTransaction(async tx => {
    const old = await tx.rewardCollection.findUnique({where:{id:c.id},include:{funding:true}});
    if (old) {
      const funding = new Map(old.funding.map(a=>[a.lotId,integer(a.lamports)]));
      if (old.slot!==c.slot || old.venue!==c.venue || old.evidence!==c.evidence ||
          integer(old.receivedLamports)!==c.receivedLamports || funding.size!==sorted.length ||
          sorted.some(a=>funding.get(a.lotId)!==a.lamports)) throw new Error('Conflicting collection replay');
      return old;
    }
    for (const a of sorted) {
      const row = await tx.rewardLot.findUniqueOrThrow({where:{id:a.lotId}});
      // Same-slot trades require instruction-level ordering; conservative exclusion.
      if (row.venue!==c.venue || row.slot>=c.slot || integer(row.collectedLamports)+a.lamports>integer(row.feeLamports))
        throw new Error('Collection does not cover this earning');
      await tx.rewardLot.update({where:{id:a.lotId},data:{collectedLamports:{increment:a.lamports.toString()}}});
    }
    return tx.rewardCollection.create({data:{id:c.id,slot:c.slot,venue:c.venue,evidence:c.evidence,
      receivedLamports:c.receivedLamports.toString(),allocatedLamports:allocated.toString(),
      funding:{create:sorted.map(a=>({...a,lamports:a.lamports.toString()}))}},include:{funding:true}});
  });
}
