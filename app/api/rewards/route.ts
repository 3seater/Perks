import { route, json } from '@/lib/http';
import { live } from '@/lib/config';
import { walletSchema } from '@/lib/auth';
import { walletRewards } from '@/lib/trade-ledger';
import { solPrice } from '@/lib/jupiter';
import { centsForLamports } from '@/lib/accounting';
import { rateLimit } from '@/lib/redis';
import {db} from '@/lib/db';
import {cardReadiness} from '@/lib/card-checkout';
export const GET = route(async request => {
  live();
  const wallet = walletSchema.parse(new URL(request.url).searchParams.get('wallet'));
  await rateLimit(`balance:${wallet}`,30);
  // This is a display of verified ledger earnings, not authorization to spend.
  // Keep the last indexed rewards visible while the indexer catches up.
  const [balance, price, cursor] = await Promise.all([walletRewards(wallet),solPrice().catch(()=>null),db.chainCursor.findUnique({where:{id:'solana'}})]);
  const tokens=await db.token.findMany({where:{mintAddress:{in:balance.tokens.map(t=>t.tokenMint)}},select:{mintAddress:true,name:true,symbol:true,imageUrl:true}});
  const names=new Map(tokens.map(token=>[token.mintAddress,token]));
  const serialize = (b: typeof balance.totals) => ({eligibleLamports:(b.pending+b.available).toString(),pendingLamports:b.pending.toString(),
    availableLamports:b.available.toString(),reservedLamports:b.reserved.toString(),spentLamports:b.spent.toString()});
  return json({denomination:'SOL',...serialize(balance.totals),availableCents:price===null?null:centsForLamports(balance.totals.available,price),
    eligibleCents:price===null?null:centsForLamports(balance.totals.pending+balance.totals.available,price),
    indexedAt:cursor?.updatedAt.toISOString()??null,syncing:!cursor||Date.now()-cursor.updatedAt.getTime()>60000,
    usdIsEstimate:true,rewardBps:Number(process.env.REWARD_BPS),serviceFeeCents:0,claimsEnabled:(await cardReadiness()).enabled,
    tokens:balance.tokens.map(t=>({tokenMint:t.tokenMint,name:names.get(t.tokenMint)?.name??t.tokenMint,symbol:names.get(t.tokenMint)?.symbol??'',imageUrl:names.get(t.tokenMint)?.imageUrl??'',...serialize(t)}))});
});
