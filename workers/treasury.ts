import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { readFile } from 'node:fs/promises';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { db } from '../lib/db';
import { rpc } from '../lib/solana';
import { live, required } from '../lib/config';
import { treasurySwap } from '../lib/jupiter';
async function main() {
  live();
  if(process.env.TREASURY_AUTOSWAP_ENABLED!=='true')throw new Error('Automatic treasury swaps disabled');
  // Isolated worker only. Never put this key in the Next.js environment or source tree.
  const signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(required('TREASURY_KEYPAIR_PATH'),'utf8'))));
  const id=new Date().toISOString().slice(0,10); // At most one prepared swap per UTC day.
  let record=await db.treasurySwap.findUnique({where:{id}});
  if(!record){
    const amount=BigInt(required('TREASURY_DAILY_SWAP_LAMPORTS'));
    const reserve=BigInt(required('TREASURY_RESERVE_LAMPORTS'));
    if(amount<=0n || reserve<10_000_000n)throw new Error('Invalid treasury limits');
    if(BigInt(await rpc().getBalance(signer.publicKey,'finalized'))<amount+reserve)throw new Error('Treasury reserve would be breached');
    const swap=await treasurySwap(signer.publicKey.toBase58(),amount);
    const transaction=VersionedTransaction.deserialize(Buffer.from(swap.swapTransaction,'base64'));
    if(!transaction.message.staticAccountKeys[0].equals(signer.publicKey))throw new Error('Invalid swap fee payer');
    transaction.sign([signer]);
    const signature=bs58.encode(transaction.signatures[0]);
    // Persist the exact signed bytes BEFORE submission. Concurrent workers lose on the unique day key.
    record=await db.treasurySwap.create({data:{id,signature,lastValidBlockHeight:swap.lastValidBlockHeight,signedTransaction:Buffer.from(transaction.serialize()).toString('base64')}});
  }
  if(record.status!=='PREPARED')return;
  const result=(await rpc().getSignatureStatuses([record.signature],{searchTransactionHistory:true})).value[0];
  if(result?.confirmationStatus==='finalized'){
    await db.treasurySwap.update({where:{id},data:{status:result.err?'FAILED':'CONFIRMED'}});return;
  }
  if(await rpc().getBlockHeight('finalized')>record.lastValidBlockHeight){
    if(!result)await db.treasurySwap.update({where:{id},data:{status:'EXPIRED'}});
    return;
  }
  await rpc().sendRawTransaction(Buffer.from(record.signedTransaction,'base64'),{skipPreflight:false,maxRetries:2});
  console.info('Treasury swap submitted; rerun to reconcile:',record.signature);
}
main().catch(e=>{console.error('Treasury worker stopped:',e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
