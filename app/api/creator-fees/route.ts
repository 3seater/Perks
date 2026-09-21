import {Transaction,PublicKey} from '@solana/web3.js';
import {NATIVE_MINT,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {OnlinePumpSdk} from '@pump-fun/pump-sdk';
import {route,origin,json} from '@/lib/http';
import {HttpError} from '@/lib/config';
import {rpc} from '@/lib/solana';

const recipient=new PublicKey('Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK');
export const GET=route(async()=>{
  const connection=rpc();
  const amount=await new OnlinePumpSdk(connection).getCreatorVaultBalanceBothPrograms(recipient);
  return json({recipient:recipient.toBase58(),lamports:amount.toString()});
});
// Only prepares an unsigned collection to the fixed fee owner. No server signer.
export const POST=route(async request=>{
  origin(request);
  const body=await request.json();
  if(body.wallet!==recipient.toBase58())throw new HttpError(403,'Connect the fee recipient wallet shown on this page.');
  const connection=rpc(),sdk=new OnlinePumpSdk(connection);
  const amount=await sdk.getCreatorVaultBalanceBothPrograms(recipient);
  if(amount.isZero())throw new HttpError(409,'No creator fees are currently available to claim.');
  const instructions=await sdk.collectCoinCreatorFeeV2Instructions(recipient,NATIVE_MINT,TOKEN_PROGRAM_ID,recipient);
  const block=await connection.getLatestBlockhash('confirmed');
  const transaction=new Transaction({feePayer:recipient,...block}).add(...instructions);
  const simulation=await connection.simulateTransaction(transaction);
  if(simulation.value.err)throw new HttpError(409,'Claim simulation failed. No transaction was sent.');
  const fee=await connection.getFeeForMessage(transaction.compileMessage(),'confirmed');
  if(fee.value===null)throw new HttpError(503,'Network fee unavailable. Please retry.');
  return json({transaction:transaction.serialize({requireAllSignatures:false}).toString('base64'),...block,feeLamports:fee.value});
});
