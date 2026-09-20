import { Prisma } from '@prisma/client';
import { db } from './db';
import { HttpError } from './config';
import { rpc } from './solana';
import { walletRewards } from './trade-ledger';
import {snapshotCache} from './server-cache';
const finalizedTip=snapshotCache(()=>rpc().getSlot('finalized'),5000);
export async function readyCursor() {
  const cursor = await db.chainCursor.findUnique({where:{id:'solana'}});
  const slot = await finalizedTip();
  if (!cursor || slot - Number(cursor.slot) > Number(process.env.INDEXER_MAX_LAG_SLOTS || 40) || Date.now() - cursor.updatedAt.getTime() > 60000) throw new HttpError(503, 'Rewards are synchronizing. Please try again shortly.');
  return cursor;
}
export async function available(wallet: string) {
  await readyCursor();
  return (await walletRewards(wallet)).totals.available;
}
// Legacy Reloadly call sites stay blocked until replaced with shared reservations.
export async function reserveRewards(_tx: Prisma.TransactionClient, _wallet: string, _debit: bigint, _balances: Map<string,bigint>): Promise<{tokenMint:string;lamports:string}[]> {
  throw new HttpError(503, 'Legacy reward redemption is disabled.');
}
