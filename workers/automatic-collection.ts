import {readFile} from 'node:fs/promises';
import {Keypair,SystemProgram,Transaction,ComputeBudgetProgram} from '@solana/web3.js';
import {NATIVE_MINT,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {OnlinePumpSdk,creatorVaultPda} from '@pump-fun/pump-sdk';
import bs58 from 'bs58';
import {db} from '../lib/db';
import {rpc,creatorRecipient} from '../lib/solana';

// Runs under the same database worker lock as card payments. Collections always
// pay the configured creator treasury. A separate, optional treasury signer is
// needed to refill the payment wallet; its path is worker-only configuration.
export async function automaticCollection(payer:Keypair){
  if(process.env.AUTO_COLLECTION_ENABLED!=='true')return;
  const connection=rpc(),treasury=creatorRecipient();
  const config=JSON.parse(await readFile('.secrets/card-worker.json','utf8')) as {treasuryKeyPath?:string};
  let owner:Keypair|undefined;
  if(payer.publicKey.equals(treasury))owner=payer;
  else if(config.treasuryKeyPath){
    owner=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(config.treasuryKeyPath,'utf8'))));
    if(!owner.publicKey.equals(treasury))throw new Error('Treasury signer mismatch');
  }
  const pending=await db.treasurySwap.findFirst({where:{id:{startsWith:'auto-'},status:'PREPARED'},orderBy:{id:'asc'}});
  if(pending){
    const status=(await connection.getSignatureStatuses([pending.signature],{searchTransactionHistory:true})).value[0];
    if(status?.confirmationStatus==='finalized'){
      await db.treasurySwap.update({where:{id:pending.id},data:{status:status.err?'FAILED':'CONFIRMED'}});return;
    }
    if(status)return;
    if(await connection.getBlockHeight('finalized')>pending.lastValidBlockHeight){
      await db.treasurySwap.update({where:{id:pending.id},data:{status:'REVIEW'}});return;
    }
    await connection.sendRawTransaction(Buffer.from(pending.signedTransaction,'base64'),{skipPreflight:false,maxRetries:2});return;
  }
  // Do not replenish again while an old payment's outcome is uncertain.
  if(await db.treasurySwap.count({where:{id:{startsWith:'auto-'},status:'REVIEW'}}))return;
  if(owner&&!payer.publicKey.equals(treasury)){
    const collection=await db.treasurySwap.findFirst({where:{id:{startsWith:'auto-collect:'},status:'CONFIRMED'},orderBy:{id:'desc'}});
    if(collection&&!await db.treasurySwap.findUnique({where:{id:`auto-refill:${collection.signature}`}})){
      const receipt=await connection.getTransaction(collection.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
      if(!receipt?.meta||receipt.meta.err)return;
      const keys=receipt.transaction.message.getAccountKeys({accountKeysFromLookups:receipt.meta.loadedAddresses});
      let index=-1;for(let i=0;i<keys.length;i++)if(keys.get(i)?.equals(treasury))index=i;
      if(index<0)throw new Error('Missing collection recipient');
      const received=receipt.meta.postBalances[index]-receipt.meta.preBalances[index];
      const [cash,bank]=await Promise.all([connection.getBalance(payer.publicKey,'finalized'),connection.getBalance(treasury,'finalized')]);
      const target=Number(process.env.AUTO_REFILL_TARGET_LAMPORTS??'100000000');
      const reserve=Number(process.env.TREASURY_RESERVE_LAMPORTS??'10000000');
      const amount=Math.min(received,target-cash,bank-reserve-10000);
      if(Number.isSafeInteger(amount)&&amount>0){
        const block=await connection.getLatestBlockhash('finalized');
        const tx=new Transaction({feePayer:owner.publicKey,...block}).add(SystemProgram.transfer({fromPubkey:treasury,toPubkey:payer.publicKey,lamports:amount}));
        tx.sign(owner);
        if((await connection.simulateTransaction(tx)).value.err)return;
        await db.treasurySwap.create({data:{id:`auto-refill:${collection.signature}`,signature:bs58.encode(tx.signature!),signedTransaction:tx.serialize().toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight}});
        return;
      }
    }
  }
  const vault=await connection.getAccountInfo(creatorVaultPda(treasury),'finalized');
  if(!vault)return;
  const rent=await connection.getMinimumBalanceForRentExemption(vault.data.length);
  if(vault.lamports-rent<Number(process.env.AUTO_COLLECTION_MIN_LAMPORTS??'1000000'))return;
  if(await connection.getBalance(payer.publicKey,'finalized')<100000)return;
  const instructions=await new OnlinePumpSdk(connection).collectCoinCreatorFeeV2Instructions(treasury,NATIVE_MINT,TOKEN_PROGRAM_ID,payer.publicKey);
  if(instructions.some(ix=>ix.keys.some(k=>k.isSigner&&!k.pubkey.equals(payer.publicKey)&&!k.pubkey.equals(owner?.publicKey??payer.publicKey))))return;
  const block=await connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:payer.publicKey,...block}).add(ComputeBudgetProgram.setComputeUnitLimit({units:300000}),...instructions);
  const signers=[payer];if(owner&&!owner.publicKey.equals(payer.publicKey)&&instructions.some(ix=>ix.keys.some(k=>k.isSigner&&k.pubkey.equals(owner!.publicKey))))signers.push(owner);
  tx.sign(...signers);
  if((await connection.simulateTransaction(tx)).value.err)return;
  const fee=(await connection.getFeeForMessage(tx.compileMessage(),'confirmed')).value;
  if(fee===null||fee>10000)return;
  await db.treasurySwap.create({data:{id:`auto-collect:${Date.now()}`,signature:bs58.encode(tx.signature!),signedTransaction:tx.serialize().toString('base64'),lastValidBlockHeight:block.lastValidBlockHeight}});
}
