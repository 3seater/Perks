import {createHash} from 'node:crypto';
import {ComputeBudgetProgram,PublicKey,type VersionedBlockResponse} from '@solana/web3.js';
import {getAssociatedTokenAddressSync,NATIVE_MINT,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID} from '@solana/spl-token';
import {PUMP_PROGRAM_ID,PUMP_AMM_PROGRAM_ID,creatorVaultPda,ammCreatorVaultPda} from '@pump-fun/pump-sdk';

type Item=VersionedBlockResponse['transactions'][number];
export type CollectionEvent={venue:'CURVE'|'AMM';eventIndex:number;creator:string;amount:bigint;quoteMint?:string;source?:string;destination?:string};
export type CollectionProof={id:string;venue:'CURVE'|'AMM';receivedLamports:bigint;evidence:string};
const discriminator=(name:string)=>createHash('sha256').update(`global:${name}`).digest().subarray(0,8);
const curveTag=discriminator('collect_creator_fee_v2'),ammTag=discriminator('collect_coin_creator_fee');
function exact(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error('Unsafe chain balance');return BigInt(value);}

/** Caller must obtain the transaction and program-authenticated events from a
 * finalized block. Accept only standalone collection transactions; never trust
 * a browser-provided event or an increase in treasury balance alone. */
export function proveCollection(item:Item,treasury:PublicKey,events:CollectionEvent[]):CollectionProof[]{
  const ours=events.filter(e=>e.creator===treasury.toBase58()&&e.amount>0n);
  if(!ours.length)return [];
  const meta=item.meta;
  if(!meta||meta.err||!meta.logMessages||meta.logMessages.some(l=>l.includes('Log truncated')))throw new Error('Incomplete collection transaction');
  const keys=item.transaction.message.getAccountKeys({accountKeysFromLookups:meta.loadedAddresses});
  const addresses=Array.from({length:keys.length},(_,i)=>keys.get(i)!.toBase58());
  const treasuryIndex=addresses.indexOf(treasury.toBase58());
  if(treasuryIndex<0)throw new Error('Treasury not in collection');
  const curveVault=creatorVaultPda(treasury), treasuryAta=getAssociatedTokenAddressSync(NATIVE_MINT,treasury);
  const ammVaultAta=getAssociatedTokenAddressSync(NATIVE_MINT,ammCreatorVaultPda(treasury),true);
  let curveCount=0,ammCount=0,closed=false;
  for(const ix of item.transaction.message.compiledInstructions){
    const program=keys.get(ix.programIdIndex)!,data=Buffer.from(ix.data);
    const accounts=ix.accountKeyIndexes.map(i=>keys.get(i)!.toBase58());
    if(program.equals(ComputeBudgetProgram.programId))continue;
    if(program.equals(PUMP_PROGRAM_ID)&&data.equals(curveTag)){
      if(accounts[0]!==treasury.toBase58()||accounts[2]!==curveVault.toBase58()||accounts[4]!==NATIVE_MINT.toBase58()||accounts[5]!==TOKEN_PROGRAM_ID.toBase58())throw new Error('Curve collection accounts mismatch');
      curveCount++;continue;
    }
    if(program.equals(PUMP_AMM_PROGRAM_ID)&&data.equals(ammTag)){
      if(accounts[0]!==NATIVE_MINT.toBase58()||accounts[1]!==TOKEN_PROGRAM_ID.toBase58()||accounts[2]!==treasury.toBase58()||accounts[4]!==ammVaultAta.toBase58()||accounts[5]!==treasuryAta.toBase58())throw new Error('AMM collection accounts mismatch');
      ammCount++;continue;
    }
    if(program.equals(ASSOCIATED_TOKEN_PROGRAM_ID)&&data.length===1&&data[0]===1){
      if(accounts[1]!==treasuryAta.toBase58()||accounts[2]!==treasury.toBase58()||accounts[3]!==NATIVE_MINT.toBase58()||accounts[5]!==TOKEN_PROGRAM_ID.toBase58())throw new Error('Unexpected token account creation');
      continue;
    }
    if(program.equals(TOKEN_PROGRAM_ID)&&data.length===1&&data[0]===9){
      if(accounts[0]!==treasuryAta.toBase58()||accounts[1]!==treasury.toBase58()||accounts[2]!==treasury.toBase58())throw new Error('Unexpected unwrap destination');
      closed=true;continue;
    }
    throw new Error('Mixed or unsupported collection transaction');
  }
  const curve=ours.filter(e=>e.venue==='CURVE'),amm=ours.filter(e=>e.venue==='AMM');
  if(curveCount>1||ammCount>1||curve.length>1||amm.length>1||curve.length>curveCount||amm.length>ammCount)throw new Error('Ambiguous collection events');
  for(const e of curve){
    if(e.quoteMint!==NATIVE_MINT.toBase58())throw new Error('Unsupported collection quote');
    const i=addresses.indexOf(curveVault.toBase58());
    if(i<0||exact(meta.preBalances[i])-exact(meta.postBalances[i])!==e.amount)throw new Error('Curve source debit mismatch');
  }
  for(const e of amm){
    if(!closed||e.source!==ammVaultAta.toBase58()||e.destination!==treasuryAta.toBase58())throw new Error('AMM fees were not unwrapped into treasury SOL');
    const i=addresses.indexOf(ammVaultAta.toBase58());
    const before=meta.preTokenBalances?.find(b=>b.accountIndex===i&&b.mint===NATIVE_MINT.toBase58());
    const after=meta.postTokenBalances?.find(b=>b.accountIndex===i&&b.mint===NATIVE_MINT.toBase58());
    if(!before||!after||BigInt(before.uiTokenAmount.amount)-BigInt(after.uiTokenAmount.amount)!==e.amount)throw new Error('AMM source debit mismatch');
  }
  const received=exact(meta.postBalances[treasuryIndex])-exact(meta.preBalances[treasuryIndex])+(treasuryIndex===0?exact(meta.fee):0n);
  if(received<ours.reduce((sum,e)=>sum+e.amount,0n))throw new Error('Treasury did not receive collected SOL');
  return ours.map(e=>({id:`${item.transaction.signatures[0]}:${e.venue}:${e.eventIndex}`,venue:e.venue,receivedLamports:e.amount,
    evidence:JSON.stringify({signature:item.transaction.signatures[0],eventIndex:e.eventIndex,recipient:treasury.toBase58(),source:e.venue==='CURVE'?curveVault.toBase58():ammVaultAta.toBase58(),amount:e.amount.toString()})}));
}
