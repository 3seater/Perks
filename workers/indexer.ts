import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
import {PublicKey} from '@solana/web3.js';
import {getAssociatedTokenAddressSync,NATIVE_MINT,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {creatorVaultPda,ammCreatorVaultPda,bondingCurvePda,canonicalPumpPoolPda} from '@pump-fun/pump-sdk';
import {db} from '../lib/db';
import {rpc,creatorRecipient} from '../lib/solana';
import {indexBlock} from '../lib/indexer';
import {discoverActivitySlots} from '../lib/indexer-discovery';
import {required,live} from '../lib/config';
import {rewardShare} from '../lib/trade-accounting';
import {targetedBlock} from '../lib/targeted-block';
let stop=false;
process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
async function main(){
  live();
  if(await rpc().getGenesisHash()!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw new Error('Mainnet RPC required');
  const rateText=required('REWARD_BPS');
  if(!/^\d{1,4}$/.test(rateText))throw new Error('Explicit reward rate required');
  const rewardBps=Number(rateText);rewardShare(0n,rewardBps);
  const policy=await db.rewardPolicy.upsert({where:{id:'trade-v1'},update:{},create:{id:'trade-v1',rewardBps}});
  if(policy.rewardBps!==rewardBps)throw new Error('Reward policy differs from the frozen ledger policy');
  if(process.env.INDEXER_MODE!=='targeted')throw new Error('Explicit targeted indexer mode required');
  const start=Number(required('INDEXER_START_SLOT'));
  if(!Number.isSafeInteger(start)||start<=0)throw new Error('Set INDEXER_START_SLOT before first launch');
  if(start<await rpc().getFirstAvailableBlock())throw new Error('RPC does not retain required history');
  await db.chainCursor.upsert({where:{id:'solana'},create:{slot:BigInt(start)},update:{}});
  while(!stop){
    const cursor=await db.chainCursor.findUniqueOrThrow({where:{id:'solana'}});
    // Capture tip before watch discovery: later launches cannot finalize behind it.
    const tip=await rpc().getSlot('finalized'), treasury=creatorRecipient();
    const tokens=await db.token.findMany({where:{status:'PENDING'},select:{mintAddress:true}});
    const addresses=[treasury,creatorVaultPda(treasury),
      getAssociatedTokenAddressSync(NATIVE_MINT,ammCreatorVaultPda(treasury),true,TOKEN_PROGRAM_ID),
      ...tokens.flatMap(t=>{const mint=new PublicKey(t.mintAddress);return [mint,bondingCurvePda(mint),canonicalPumpPoolPda(mint)];})];
    const watched=[...new Map(addresses.map(a=>[a.toBase58(),a])).values()];
    const slots=new Set<number>();
    const signatures=new Map<number,Set<string>>();
    for(const address of watched){
      const found=await discoverActivitySlots(before=>rpc().getSignaturesForAddress(address,{before,limit:1000,minContextSlot:tip},'finalized'),Number(cursor.slot),tip,20,row=>{const set=signatures.get(row.slot)??new Set<string>();set.add(row.signature);signatures.set(row.slot,set);});
      found.forEach(slot=>slots.add(slot));
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    for(const slot of [...slots].sort((a,b)=>a-b)){
      const header=await rpc().getBlockSignatures(slot,'finalized');
      const block=await targetedBlock(slot,header.signatures,signatures.get(slot)!,async signature=>{
        const tx=await rpc().getTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
        await new Promise(resolve=>setTimeout(resolve,150));return tx;
      });
      await indexBlock(slot,block);
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    await db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73482910)`;
      await tx.chainCursor.updateMany({where:{id:'solana',slot:{lte:BigInt(tip)}},data:{slot:BigInt(tip)}});
    });
    console.info(JSON.stringify({event:'indexer_scan',watchedAddresses:watched.length,activityBlocks:slots.size,throughSlot:tip}));
    if(process.argv.includes('--once'))break;
    await new Promise(resolve=>setTimeout(resolve,15000));
  }
}
main().catch(()=>{console.error('Indexer stopped; inspect readiness and history coverage before restarting.');process.exitCode=1;}).finally(()=>db.$disconnect());
