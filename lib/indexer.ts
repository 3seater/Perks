import { EventParser } from '@coral-xyz/anchor';
import { PublicKey, type VersionedBlockResponse } from '@solana/web3.js';
import { getPumpProgram, getPumpAmmProgram, PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID, canonicalPumpPoolPda, creatorVaultPda,ammCreatorVaultPda, type CreateEventBc, type TradeEventBc, type BuyEventAmm, type SellEventAmm } from '@pump-fun/pump-sdk';
import {getAssociatedTokenAddressSync,NATIVE_MINT} from '@solana/spl-token';
import { db } from './db';
import { rpc, creatorRecipient } from './solana';
import { integer } from './accounting';
import { recordEarning, fundProvenCollection } from './trade-ledger';
import {proveCollection,type CollectionEvent} from './collection-proof';
import { attributeTrader, rewardShare } from './trade-accounting';
import { required } from './config';
import { SOL } from './jupiter';
const normalize = (name:string) => name.replaceAll('_','').toLowerCase();
export async function indexBlock(slot:number, block:Pick<VersionedBlockResponse,'transactions'>) {
  const rateText = required('REWARD_BPS');
  if (!/^\d{1,4}$/.test(rateText)) throw new Error('Explicit REWARD_BPS required before indexing');
  const rewardBps = Number(rateText);
  rewardShare(0n,rewardBps);
  const bcParser = new EventParser(PUMP_PROGRAM_ID,getPumpProgram(rpc()).coder);
  const ammParser = new EventParser(PUMP_AMM_PROGRAM_ID,getPumpAmmProgram(rpc()).coder);
  const creator = creatorRecipient().toBase58();
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73482910)`;
    const cursor = await tx.chainCursor.findUniqueOrThrow({where:{id:'solana'}});
    if (Number(cursor.slot)>=slot) return;
    const policy = await tx.rewardPolicy.upsert({where:{id:'trade-v1'},update:{},create:{id:'trade-v1',rewardBps}});
    if (policy.rewardBps !== rewardBps) throw new Error('Reward rate is frozen; a versioned policy migration is required to change it');
    const known = new Map((await tx.token.findMany()).map(t=>[t.mintAddress,t]));
    const pools = new Map([...known.keys()].map(m=>[canonicalPumpPoolPda(new PublicKey(m)).toBase58(),m]));
    const relevantKeys=new Set([creator,creatorVaultPda(new PublicKey(creator)).toBase58(),getAssociatedTokenAddressSync(NATIVE_MINT,ammCreatorVaultPda(new PublicKey(creator)),true).toBase58(),...known.keys(),...pools.keys()]);
    for (const item of block.transactions) {
      if (!item.meta || item.meta.err) continue;
      const signature=item.transaction.signatures[0];
      if (await tx.chainReceipt.findUnique({where:{signature}})) continue;
      const logs=item.meta.logMessages;
      const keys=item.transaction.message.getAccountKeys({accountKeysFromLookups:item.meta.loadedAddresses});
      if(!Array.from({length:keys.length},(_,i)=>keys.get(i)?.toBase58()).some(key=>key&&relevantKeys.has(key)))continue;
      const signers = Array.from({length:keys.length},(_,i)=>item.transaction.message.isAccountSigner(i) ? keys.get(i)?.toBase58() : undefined).filter((k): k is string=>!!k);
      const invokesPump=Array.from({length:keys.length},(_,i)=>keys.get(i)?.toBase58()).some(k=>k===PUMP_PROGRAM_ID.toBase58()||k===PUMP_AMM_PROGRAM_ID.toBase58());
      if(invokesPump && (!logs || logs.some(l=>l.includes('Log truncated')))) throw new Error(`Incomplete logs at slot ${slot}; indexer stopped`);
      const bcEvents=logs?[...bcParser.parseLogs(logs)]:[];
      const ammEvents=logs?[...ammParser.parseLogs(logs)]:[];
      const collectionEvents:CollectionEvent[]=[];
      for(const [i,event] of bcEvents.entries())if(normalize(event.name)==='collectcreatorfeeevent'){
        const e=event.data as {creator:PublicKey;creatorFee:{toString():string};quoteMint:PublicKey};
        collectionEvents.push({venue:'CURVE',eventIndex:i,creator:e.creator.toBase58(),amount:BigInt(e.creatorFee.toString()),quoteMint:e.quoteMint.toBase58()});
      }
      for(const [i,event] of ammEvents.entries())if(normalize(event.name)==='collectcoincreatorfeeevent'){
        const e=event.data as {coinCreator:PublicKey;coinCreatorFee:{toString():string};coinCreatorVaultAta:PublicKey;coinCreatorTokenAccount:PublicKey};
        collectionEvents.push({venue:'AMM',eventIndex:i,creator:e.coinCreator.toBase58(),amount:BigInt(e.coinCreatorFee.toString()),source:e.coinCreatorVaultAta.toBase58(),destination:e.coinCreatorTokenAccount.toBase58()});
      }
      const collectionProofs=proveCollection(item,new PublicKey(creator),collectionEvents);
      const fees=new Map<string,bigint>();
      let relevant=false,eventIndex=0;
      for (const [protocolEventIndex,event] of bcEvents.entries()) {
        const name=normalize(event.name);
        if(name==='createevent') {
          const e=event.data as unknown as CreateEventBc;
          const token=known.get(e.mint.toBase58());
          if(!token) continue;
          if(e.creator.toBase58()!==creator || e.user.toBase58()!==token.creatorWallet || e.uri!==token.metadataUri || e.name!==token.name || e.symbol!==token.symbol || e.isMayhemMode || e.isCashbackEnabled || e.isHolderReward || ![SOL,PublicKey.default.toBase58()].includes(e.quoteMint.toBase58())) throw new Error('Perks launch event mismatch');
          const updated=await tx.token.update({where:{mintAddress:token.mintAddress},data:{status:'ACTIVE',launchSignature:signature,launchSlot:BigInt(slot),totalSupply:e.tokenTotalSupply.toString()}});
          known.set(token.mintAddress,updated);relevant=true;
        }
        if(name==='tradeevent') {
          const e=event.data as unknown as TradeEventBc, mint=e.mint.toBase58(), token=known.get(mint);
          if(!token || token.status!=='ACTIVE')continue;
          if(e.creator.toBase58()!==creator) throw new Error('Creator changed; claims halted until reviewed');
          if(e.quoteMint && ![SOL,PublicKey.default.toBase58()].includes(e.quoteMint.toBase58())) throw new Error('Unsupported non-SOL curve');
          fees.set(mint,(fees.get(mint)??0n)+integer(e.creatorFee));relevant=true;
          await recordEarning(tx,{signature,eventIndex:protocolEventIndex,venue:'CURVE',slot:BigInt(slot),tokenMint:mint,
            walletAddress:attributeTrader(e.user.toBase58(),signers),side:e.isBuy?'BUY':'SELL',feeLamports:integer(e.creatorFee),rewardBps});
          await tx.trade.create({data:{id:`${signature}:${eventIndex++}`,tokenMint:mint,volumeLamports:e.solAmount.toString(),occurredAt:new Date(Number(e.timestamp.toString())*1000)}});
          // Pump's standard initial real token reserves for non-mayhem create_v2 coins.
          const progress=Math.max(0,Math.min(100,100*(1-Number(e.realTokenReserves.toString())/793100000000000)));
          const updated=await tx.token.update({where:{mintAddress:mint},data:{curveProgress:progress}});known.set(mint,updated);
        }
      }
      for(const [protocolEventIndex,event] of ammEvents.entries()) {
        const name=normalize(event.name);
        if(name!=='buyevent'&&name!=='sellevent')continue;
        const e=event.data as unknown as BuyEventAmm & SellEventAmm;
        const mint=pools.get(e.pool.toBase58());
        if(!mint || known.get(mint)?.status!=='ACTIVE')continue;
        if(e.coinCreator.toBase58()!==creator)throw new Error('AMM creator changed; halt claims');
        fees.set(mint,(fees.get(mint)??0n)+integer(e.coinCreatorFee));relevant=true;
        await recordEarning(tx,{signature,eventIndex:protocolEventIndex,venue:'AMM',slot:BigInt(slot),tokenMint:mint,
          walletAddress:attributeTrader(e.user.toBase58(),signers),side:name==='buyevent'?'BUY':'SELL',feeLamports:integer(e.coinCreatorFee),rewardBps});
        await tx.trade.create({data:{id:`${signature}:amm:${eventIndex++}`,tokenMint:mint,volumeLamports:(name==='buyevent'?e.quoteAmountIn:e.quoteAmountOut).toString(),occurredAt:new Date(Number(e.timestamp.toString())*1000)}});
      }
      // Holder counts remain market data, but no longer earn rewards.
      for(const [mint,fee] of fees) {
        const updated=await tx.token.update({where:{mintAddress:mint},data:{feeLamports:{increment:fee.toString()}}});
        known.set(mint,updated);
      }
      // Targeted discovery does not observe every SPL transfer; do not derive
      // holder counts or supply changes from an incomplete transfer history.
      if(process.env.INDEXER_MODE!=='targeted') {
      const deltas=new Map<string,{wallet:string;mint:string;delta:bigint}>();
      for(const [balances,sign] of [[item.meta.preTokenBalances,-1n],[item.meta.postTokenBalances,1n]] as const) {
        for(const b of balances??[]) {
          if(!known.has(b.mint) || known.get(b.mint)?.status!=='ACTIVE')continue;
          if(!b.owner)throw new Error('Missing token owner; cannot account for transfer');
          relevant=true;
          const key=`${b.owner}:${b.mint}`, value=deltas.get(key)??{wallet:b.owner,mint:b.mint,delta:0n};
          value.delta+=sign*BigInt(b.uiTokenAmount.amount);deltas.set(key,value);
        }
      }
      for(const d of deltas.values()) {
        if(d.delta===0n)continue;
        const old=await tx.userTokenCheckpoint.findUnique({where:{walletAddress_tokenMint:{walletAddress:d.wallet,tokenMint:d.mint}}});
        const previous=old?integer(old.balance):0n, balance=previous+d.delta;
        if(balance<0n)throw new Error('Indexer missing historical balances; rebuild from before launch');
        await tx.userTokenCheckpoint.upsert({where:{walletAddress_tokenMint:{walletAddress:d.wallet,tokenMint:d.mint}},create:{walletAddress:d.wallet,tokenMint:d.mint,balance:balance.toString()},update:{balance:balance.toString()}});
        // Track burns/mints through supply deltas below, including non-trading transactions.
      }
      const supplyDelta=new Map<string,bigint>();
      for(const d of deltas.values())supplyDelta.set(d.mint,(supplyDelta.get(d.mint)??0n)+d.delta);
      for(const [mint,delta] of supplyDelta) {
        const t=known.get(mint)!;
        // Creation's supply is already read from the authenticated event.
        if(t.launchSignature===signature || delta===0n)continue;
        const next=integer(t.totalSupply)+delta;
        if(next<=0n)throw new Error('Invalid remaining token supply');
        known.set(mint,await tx.token.update({where:{mintAddress:mint},data:{totalSupply:next.toString()}}));
      }
      }
      for(const proof of collectionProofs){await fundProvenCollection(tx,BigInt(slot),proof);relevant=true;}
      if(relevant)await tx.chainReceipt.create({data:{signature,slot:BigInt(slot)}});
    }
    await tx.chainCursor.update({where:{id:'solana'},data:{slot:BigInt(slot)}});
  },{timeout:60000,isolationLevel:'Serializable'});
}
