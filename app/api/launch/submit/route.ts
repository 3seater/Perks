import {z} from 'zod';
import {verifyPreparedLaunch,launchSignatureDiagnostic} from '@/lib/launch-transaction';
import {route,origin,json} from '@/lib/http';
import {live,HttpError} from '@/lib/config';
import {redis,rateLimit} from '@/lib/redis';
import {rpc} from '@/lib/solana';
import {Keypair,VersionedTransaction} from '@solana/web3.js';
import {decrypt,encrypt} from '@/lib/crypto';
import bs58 from 'bs58';
export const POST=route(async request=>{
  origin(request);live('LAUNCHES_ENABLED');
  const input=z.object({mint:z.string().max(44),transaction:z.string().max(2000)}).parse(await request.json());
  const raw=await redis().get(`prepared-launch:${input.mint}`);
  if(!raw)throw new HttpError(409,'This prepared launch expired. Check your wallet history before starting another launch.');
  const prepared=JSON.parse(raw);
  const signer=prepared.mintSignerEncrypted?Keypair.fromSecretKey(Uint8Array.from(decrypt<number[]>(prepared.mintSignerEncrypted))):undefined;
  if(signer&&signer.publicKey.toBase58()!==input.mint)throw new HttpError(403,'Prepared mint identity does not match.');
  let tx;try{tx=verifyPreparedLaunch(input.transaction,prepared.message,prepared.mintSignature?{publicKey:input.mint,signature:prepared.mintSignature}:undefined,signer);}catch(error){
    console.error(JSON.stringify({event:'launch_signature_rejected',reason:error instanceof Error?error.message:'Unknown signature error',hasMintSignature:!!prepared.mintSignature,...launchSignatureDiagnostic(input.transaction,prepared.message)}));
    throw new HttpError(403,signer?'Signed transaction does not match the prepared launch. No transaction was submitted.':'This launch predates the wallet compatibility update. Prepare it again. No transaction was submitted.');
  }
  await rateLimit(`launch-send:${input.mint}`,10,600);
  const knownSignature=bs58.encode(tx.signature!);
  const known=(await rpc().getSignatureStatuses([knownSignature],{searchTransactionHistory:true})).value[0];
  if(known){
    if(known.err)throw new HttpError(409,'The previous launch transaction failed on-chain. Prepare it again.');
    return json({signature:knownSignature});
  }
  // Catch expiry and wallet assertion failures before spending a network fee.
  if(!(await rpc().isBlockhashValid(tx.recentBlockhash!,{commitment:'confirmed'})).value)throw new HttpError(409,'This launch expired. Prepare it again. No transaction was submitted.');
  const simulation=await rpc().simulateTransaction(new VersionedTransaction(tx.compileMessage()),{sigVerify:false,commitment:'confirmed'});
  if(simulation.value.err)throw new HttpError(409,'The approved launch could not be simulated. Prepare it again. No transaction was submitted.');
  // Persist before sending so confirmation can rebroadcast identical bytes after a dropped RPC response.
  const receiptKey=`submitted-launch:${input.mint}`;
  const receipt={signature:knownSignature,blockhash:tx.recentBlockhash!,transaction:tx.serialize().toString('base64')};
  const saved=await redis().set(receiptKey,encrypt(receipt),'EX',86400,'NX');
  if(!saved){
    const existing=decrypt<typeof receipt>((await redis().get(receiptKey))!);
    if(existing.signature!==knownSignature)throw new HttpError(409,'A different transaction is already submitted for this launch.');
  }
  try{await rpc().sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:20,preflightCommitment:'confirmed'});}
  catch{console.warn('Launch broadcast needs confirmation or retry.');}
  return json({signature:knownSignature});
});
