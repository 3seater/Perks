import {z} from 'zod';
import {ComputeBudgetProgram,Transaction} from '@solana/web3.js';
import {NATIVE_MINT,TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {OnlinePumpSdk} from '@pump-fun/pump-sdk';
import {route,origin,json} from '@/lib/http';
import {HttpError,demo} from '@/lib/config';
import {creatorRecipient,rpc} from '@/lib/solana';
import {walletSchema} from '@/lib/auth';
import {rateLimit} from '@/lib/redis';

// Builds an unsigned transaction only. Treasury owner signs in their wallet.
export const POST=route(async request=>{
  origin(request);
  if(demo()||process.env.COLLECTIONS_ENABLED!=='true'||process.env.PERKS_CUSTODY_MODE!=='wallet')throw new HttpError(503,'Fee collection is not enabled.');
  const {wallet}=z.object({wallet:walletSchema}).parse(await request.json());
  const treasury=creatorRecipient();
  if(wallet!==treasury.toBase58())throw new HttpError(403,'Connect the designated treasury wallet.');
  await rateLimit('treasury:collect',3,60);
  const connection=rpc();
  const instructions=await new OnlinePumpSdk(connection).collectCoinCreatorFeeV2Instructions(treasury,NATIVE_MINT,TOKEN_PROGRAM_ID,treasury);
  const block=await connection.getLatestBlockhash('finalized');
  const transaction=new Transaction({feePayer:treasury,...block}).add(ComputeBudgetProgram.setComputeUnitLimit({units:300000}),...instructions);
  const simulation=await connection.simulateTransaction(transaction);
  if(simulation.value.err)throw new HttpError(409,'Collection simulation failed. No transaction was sent.');
  const fee=await connection.getFeeForMessage(transaction.compileMessage(),'confirmed');
  if(fee.value===null)throw new HttpError(503,'Network fee unavailable.');
  return json({transaction:transaction.serialize({requireAllSignatures:false}).toString('base64'),...block,feeLamports:fee.value,treasury:treasury.toBase58()});
});
