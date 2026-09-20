import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { readFile } from 'node:fs/promises';
import { Keypair, Transaction } from '@solana/web3.js';
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { OnlinePumpSdk, PUMP_PROGRAM_ID, PUMP_AMM_PROGRAM_ID } from '@pump-fun/pump-sdk';
import bs58 from 'bs58';
import { rpc, vault } from '../lib/solana';
import { db } from '../lib/db';
import { required, live } from '../lib/config';
import { collectViaVault, unwrapVaultSol, sweepVault } from '../lib/vault-instructions';
async function main(){
  live();
  if(process.env.TREASURY_AUTOSWAP_ENABLED!=='true')throw new Error('Treasury automation disabled');
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(required('TREASURY_KEYPAIR_PATH'),'utf8'))));
  const id=`collect:${new Date().toISOString().slice(0,10)}`;
  let record=await db.treasurySwap.findUnique({where:{id}});
  if(!record){
    const sdk=new OnlinePumpSdk(rpc());
    const inner=await sdk.collectCoinCreatorFeeV2Instructions(vault(),NATIVE_MINT,TOKEN_PROGRAM_ID,signer.publicKey);
    const instructions=inner.map(ix=>{
      if(ix.programId.equals(PUMP_PROGRAM_ID)||ix.programId.equals(PUMP_AMM_PROGRAM_ID))return collectViaVault(signer.publicKey,ix);
      if(ix.programId.equals(TOKEN_PROGRAM_ID)&&ix.data[0]===9)return unwrapVaultSol(signer.publicKey,ix.keys[0].pubkey);
      if(ix.keys.some(k=>k.isSigner&&!k.pubkey.equals(signer.publicKey)))throw new Error('Unsupported collection signer');
      return ix;
    });
    // Sweep the pre-existing vault balance only. Newly collected funds are swept next cycle.
    const balance=BigInt(await rpc().getBalance(vault(),'finalized'));
    if(balance>1_000_000n)instructions.push(sweepVault(signer.publicKey,balance-1_000_000n));
    const block=await rpc().getLatestBlockhash('finalized');
    const transaction=new Transaction({feePayer:signer.publicKey,...block}).add(...instructions);transaction.sign(signer);
    record=await db.treasurySwap.create({data:{id,signature:bs58.encode(transaction.signature!),signedTransaction:transaction.serialize().toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight}});
  }
  if(record.status!=='PREPARED')return;
  const status=(await rpc().getSignatureStatuses([record.signature],{searchTransactionHistory:true})).value[0];
  if(status?.confirmationStatus==='finalized'){await db.treasurySwap.update({where:{id},data:{status:status.err?'FAILED':'CONFIRMED'}});return;}
  if(await rpc().getBlockHeight('finalized')>record.lastValidBlockHeight){if(!status)await db.treasurySwap.update({where:{id},data:{status:'EXPIRED'}});return;}
  await rpc().sendRawTransaction(Buffer.from(record.signedTransaction,'base64'),{skipPreflight:false,maxRetries:2});
  console.info('Collection submitted; rerun to reconcile:',record.signature);
}
main().catch(e=>{console.error('Collection stopped:',e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
