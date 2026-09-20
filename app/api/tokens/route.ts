import { route, json } from '@/lib/http';
import { demo } from '@/lib/config';
import { demoTokens } from '@/lib/demo';
import { db } from '@/lib/db';
import { solPrice } from '@/lib/jupiter';
import { integer, centsForLamports } from '@/lib/accounting';
import { PUMP_SDK, PUMP_PROGRAM_ID, bondingCurvePda } from '@pump-fun/pump-sdk';
import { PublicKey } from '@solana/web3.js';
import { rpc } from '@/lib/solana';
import {snapshotCache} from '@/lib/server-cache';
import {rewardShare} from '@/lib/trade-accounting';
export const dynamic = 'force-dynamic';
const liveFeed = snapshotCache(async () => {
  const [tokens, cards, launched, fees, price] = await Promise.all([
    db.token.findMany({where:{status:'ACTIVE'},orderBy:{createdAt:'desc'},take:60,include:{_count:{select:{holders:{where:{balance:{gt:0}}}}},trades:{where:{occurredAt:{gte:new Date(Date.now()-86400000)}}}}}),
    db.redemptionOrder.count({where:{status:'COMPLETED'}}),
    db.token.count({where:{launchSignature:{not:null}}}),
    db.rewardLot.findMany({where:{walletAddress:{not:null}},select:{feeLamports:true,rewardBps:true}}),
    solPrice().catch(()=>null)
  ]);
  const accounts = tokens.length ? await rpc().getMultipleAccountsInfo(tokens.map(t => bondingCurvePda(new PublicKey(t.mintAddress))), 'finalized') : [];
  const metrics = accounts.map(account => {
    if (!account || !account.owner.equals(PUMP_PROGRAM_ID)) return null;
    const curve = PUMP_SDK.decodeBondingCurve(account);
    const solQuote = curve.quoteMint.equals(PublicKey.default) || curve.quoteMint.toBase58() === 'So11111111111111111111111111111111111111112';
    // Completed curves no longer price the token; leave their market cap unknown.
    const marketCap = price!==null && !curve.complete && solQuote && !curve.virtualTokenReserves.isZero()
      ? centsForLamports(BigInt(curve.tokenTotalSupply.toString()) * BigInt(curve.virtualQuoteReserves.toString()) / BigInt(curve.virtualTokenReserves.toString()), price) / 100
      : null;
    return { graduated: curve.complete, marketCap };
  });
  return {demo:false,stats:{generated:price===null?null:centsForLamports(fees.reduce((sum,lot)=>sum+rewardShare(integer(lot.feeLamports),lot.rewardBps),0n),price)/100,cards,launched},tokens:tokens.map((t,i) => ({createdAt:t.createdAt.toISOString(),holders:process.env.INDEXER_MODE==='targeted'?null:t._count.holders,graduated:metrics[i]?.graduated??t.curveProgress>=100,marketCap:metrics[i]?.marketCap??null,mint:t.mintAddress,name:t.name,symbol:t.symbol,description:t.description,imageUrl:t.imageUrl,glyph:'✦',color:'#d4f86b',progress:t.curveProgress,volume:price===null?null:centsForLamports(t.trades.reduce((sum,v)=>sum+integer(v.volumeLamports),0n),price)/100,pot:price===null?null:centsForLamports(integer(t.feeLamports),price)/100,change:null}))};
},10000);
export const GET=route(async()=>demo()?json({demo:true,tokens:demoTokens,stats:{generated:128450,cards:4826,launched:142}}):json(await liveFeed()));
