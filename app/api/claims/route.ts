import { randomUUID } from 'node:crypto';
import { route, origin, json } from '@/lib/http';
import { live, HttpError } from '@/lib/config';
import { proofSchema, verifySignature } from '@/lib/auth';
import { db } from '@/lib/db';
import { rateLimit, walletLock } from '@/lib/redis';
import { productId, type Brand } from '@/lib/catalog';
import { readyCursor, reserveRewards } from '@/lib/rewards';
import { snapshot } from '@/lib/solana';
import { integer } from '@/lib/accounting';
import { dispatch, publicOrder } from '@/lib/orders';
export const runtime = 'nodejs';
export const POST = route(async request => {
  origin(request); live('CLAIMS_ENABLED');
  const proof = proofSchema.parse(await request.json());
  const challenge = await db.challenge.findUnique({where:{id:proof.challengeId}});
  if (!challenge || challenge.expiresAt.getTime() < Date.now()) throw new HttpError(401,'Redemption quote expired. Request a new quote.');
  verifySignature(challenge.walletAddress,challenge.message,proof.signature);
  await rateLimit(`claim:${challenge.walletAddress}`,10);
  const existing = await db.redemptionOrder.findUnique({where:{challengeId:challenge.id}});
  if (existing) return json(await publicOrder(existing.id));
  return walletLock(challenge.walletAddress,async () => {
    const cursor = await readyCursor();
    const balances = await snapshot(challenge.walletAddress,Number(cursor.slot));
    const order = await db.$transaction(async tx => {
      // Shared with the ordered indexer: no checkpoint can change during reservation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73482910)`;
      const old = await tx.redemptionOrder.findUnique({where:{challengeId:challenge.id}});
      if (old) return old;
      const used = await tx.challenge.updateMany({where:{id:challenge.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
      if (!used.count) throw new HttpError(409,'This quote was already used or expired.');
      const pending = await tx.redemptionOrder.count({where:{walletAddress:challenge.walletAddress,status:{in:['RESERVED','SUBMITTING','RECONCILING']}}});
      if (pending) throw new HttpError(409,'Your previous order is still being reconciled.');
      const debits=await reserveRewards(tx,challenge.walletAddress,integer(challenge.debitLamports),balances);
      return tx.redemptionOrder.create({data:{challengeId:challenge.id,customIdentifier:`perks_claim_${randomUUID()}`,walletAddress:challenge.walletAddress,brandName:challenge.brand,productId:productId(challenge.brand as Brand),amountCents:challenge.amountCents,debitLamports:challenge.debitLamports,debits:{create:debits}}});
    },{isolationLevel:'Serializable',timeout:15000});
    await dispatch(order.id);
    return json(await publicOrder(order.id));
  });
});
