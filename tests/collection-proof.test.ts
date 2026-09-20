import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PublicKey,Transaction,TransactionInstruction,SystemProgram,type VersionedBlockResponse} from '@solana/web3.js';
import {NATIVE_MINT,TOKEN_PROGRAM_ID,getAssociatedTokenAddressSync,ASSOCIATED_TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {PUMP_PROGRAM_ID,PUMP_AMM_PROGRAM_ID,creatorVaultPda,ammCreatorVaultPda} from '@pump-fun/pump-sdk';
import {proveCollection,type CollectionEvent} from '../lib/collection-proof';
const treasury=new PublicKey('Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK');
function fixture(){
  const source=creatorVaultPda(treasury);
  const keys=[treasury,getAssociatedTokenAddressSync(NATIVE_MINT,treasury),source,getAssociatedTokenAddressSync(NATIVE_MINT,source,true),NATIVE_MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,SystemProgram.programId];
  const ix=new TransactionInstruction({programId:PUMP_PROGRAM_ID,keys:keys.map(pubkey=>({pubkey,isSigner:pubkey.equals(treasury),isWritable:true})),data:createHash('sha256').update('global:collect_creator_fee_v2').digest().subarray(0,8)});
  const transaction=new Transaction({feePayer:treasury,recentBlockhash:PublicKey.default.toBase58()}).add(ix);
  const message=transaction.compileMessage();
  const pre=message.accountKeys.map(()=>100000),post=[...pre];
  post[0]+=10000-5000;post[message.accountKeys.findIndex(k=>k.equals(source))]-=10000;
  const item={transaction:{message,signatures:['fixture-collection']},meta:{err:null,fee:5000,preBalances:pre,postBalances:post,logMessages:['Program log: collection'],preTokenBalances:[],postTokenBalances:[]}} as unknown as VersionedBlockResponse['transactions'][number];
  const event:CollectionEvent={venue:'CURVE',eventIndex:0,creator:treasury.toBase58(),amount:10000n,quoteMint:NATIVE_MINT.toBase58()};
  return {item,event,transaction};
}
test('curve collection proves both protocol source debit and fee-adjusted treasury receipt',()=>{
  const {item,event}=fixture();
  assert.equal(proveCollection(item,treasury,[event])[0].receivedLamports,10000n);
  assert.throws(()=>proveCollection(item,treasury,[{...event,amount:10001n}]),/debit/);
  item.meta!.postBalances[0]-=1;
  assert.throws(()=>proveCollection(item,treasury,[event]),/receive/);
});
test('collection rejects failed, truncated, mixed and unsupported currency transactions',()=>{
  let f=fixture();f.item.meta!.err={InstructionError:[0,'InvalidArgument']};assert.throws(()=>proveCollection(f.item,treasury,[f.event]));
  f=fixture();f.item.meta!.logMessages=['Log truncated'];assert.throws(()=>proveCollection(f.item,treasury,[f.event]));
  f=fixture();assert.throws(()=>proveCollection(f.item,treasury,[{...f.event,quoteMint:PublicKey.default.toBase58()}]));
  f=fixture();f.transaction.add(SystemProgram.transfer({fromPubkey:treasury,toPubkey:creatorVaultPda(treasury),lamports:1}));
  f.item.transaction.message=f.transaction.compileMessage();assert.throws(()=>proveCollection(f.item,treasury,[f.event]),/Mixed/);
  f=fixture();assert.deepEqual(proveCollection(f.item,treasury,[{...f.event,creator:PublicKey.default.toBase58()}]),[]);
});

test('AMM collection requires matching WSOL source debit and an unwrap to the treasury',()=>{
  const authority=ammCreatorVaultPda(treasury),source=getAssociatedTokenAddressSync(NATIVE_MINT,authority,true),destination=getAssociatedTokenAddressSync(NATIVE_MINT,treasury);
  const accounts=[NATIVE_MINT,TOKEN_PROGRAM_ID,treasury,authority,source,destination];
  const tx=new Transaction({feePayer:treasury,recentBlockhash:PublicKey.default.toBase58()}).add(new TransactionInstruction({programId:PUMP_AMM_PROGRAM_ID,keys:accounts.map(pubkey=>({pubkey,isSigner:pubkey.equals(treasury),isWritable:true})),data:createHash('sha256').update('global:collect_coin_creator_fee').digest().subarray(0,8)}));
  const event:CollectionEvent={venue:'AMM',eventIndex:0,creator:treasury.toBase58(),amount:10000n,source:source.toBase58(),destination:destination.toBase58()};
  function item(){
    const message=tx.compileMessage(),pre=message.accountKeys.map(()=>100000),post=[...pre];post[0]+=5000;
    const i=message.accountKeys.findIndex(k=>k.equals(source));
    const balance=(amount:string)=>({accountIndex:i,mint:NATIVE_MINT.toBase58(),owner:authority.toBase58(),uiTokenAmount:{amount,decimals:9,uiAmount:null}});
    return {transaction:{message,signatures:['amm-fixture']},meta:{err:null,fee:5000,preBalances:pre,postBalances:post,logMessages:['Program log: collection'],preTokenBalances:[balance('10000')],postTokenBalances:[balance('0')]}} as unknown as VersionedBlockResponse['transactions'][number];
  }
  assert.throws(()=>proveCollection(item(),treasury,[event]),/unwrapped/);
  tx.add(new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:[destination,treasury,treasury].map(pubkey=>({pubkey,isSigner:pubkey.equals(treasury),isWritable:true})),data:Buffer.from([9])}));
  assert.equal(proveCollection(item(),treasury,[event])[0].receivedLamports,10000n);
  const bad=item();bad.meta!.postTokenBalances![0].uiTokenAmount.amount='1';
  assert.throws(()=>proveCollection(bad,treasury,[event]),/source debit/);
});
