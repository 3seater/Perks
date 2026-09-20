import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../lib/db';
import { reloadly } from '../lib/reloadly';
import { integer, SCALE } from '../lib/accounting';
import { live } from '../lib/config';
// Operator-only recovery, never called from a public route.
// Requires a definitive FAILED provider transaction AND operator verification of the provider refund.
async function main() {
  live();
  const id=process.argv[2];
  if(!id || !process.argv.includes('--provider-refund-verified'))throw new Error('Usage: tsx workers/refund.ts ORDER_ID --provider-refund-verified');
  const order=await db.redemptionOrder.findUniqueOrThrow({where:{id}});
  if(!order.reloadlyOrderId)throw new Error('Unknown provider outcome; never refund an uncertain order');
  const remote=await reloadly.getOrder(order.reloadlyOrderId);
  if(remote.status!=='FAILED')throw new Error('Provider must confirm FAILED status');
  await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(73482910)`;
    const current=await tx.redemptionOrder.findUniqueOrThrow({where:{id},include:{debits:true}});
    if(current.status==='REFUNDED')return;
    if(current.status==='COMPLETED' || current.voucherEncrypted)throw new Error('Issued cards cannot be refunded');
    if(current.debits.reduce((sum,d)=>sum+integer(d.lamports),0n)!==integer(current.debitLamports))throw new Error('Debit audit mismatch');
    for(const d of current.debits)await tx.userTokenCheckpoint.update({where:{walletAddress_tokenMint:{walletAddress:current.walletAddress,tokenMint:d.tokenMint}},data:{accruedScaled:{increment:(integer(d.lamports)*SCALE).toString()}}});
    await tx.redemptionOrder.update({where:{id},data:{status:'REFUNDED',errorCode:'PROVIDER_REFUND_VERIFIED'}});
  },{isolationLevel:'Serializable'});
}
main().catch(e=>{console.error('Refund stopped:',e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
