import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { required } from './config';
import { vault } from './solana';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
// Wrap the current official Pump SDK's collection instruction, preserving account order.
// The treasury signs the outer transaction; this program signs the inner CPI as the PDA.
export function collectViaVault(authority:PublicKey, inner:TransactionInstruction) {
  return new TransactionInstruction({programId:new PublicKey(required('PERKS_VAULT_PROGRAM_ID')),keys:[{pubkey:authority,isSigner:true,isWritable:true},{pubkey:vault(),isSigner:false,isWritable:true},{pubkey:inner.programId,isSigner:false,isWritable:false},...inner.keys.map(k=>({...k,isSigner:k.pubkey.equals(vault())?false:k.isSigner}))],data:Buffer.concat([Buffer.from([1]),inner.data])});
}
export function sweepVault(authority:PublicKey, lamports:bigint) {
  if(lamports<=0n || lamports>18446744073709551615n)throw new Error('Invalid sweep amount');
  const data=Buffer.alloc(9);data[0]=0;data.writeBigUInt64LE(lamports,1);
  return new TransactionInstruction({programId:new PublicKey(required('PERKS_VAULT_PROGRAM_ID')),keys:[{pubkey:authority,isSigner:true,isWritable:true},{pubkey:vault(),isSigner:false,isWritable:true},{pubkey:SystemProgram.programId,isSigner:false,isWritable:false}],data});
}
export function unwrapVaultSol(authority:PublicKey, source:PublicKey) {
  return new TransactionInstruction({programId:new PublicKey(required('PERKS_VAULT_PROGRAM_ID')),keys:[{pubkey:authority,isSigner:true,isWritable:true},{pubkey:vault(),isSigner:false,isWritable:true},{pubkey:source,isSigner:false,isWritable:true},{pubkey:TOKEN_PROGRAM_ID,isSigner:false,isWritable:false}],data:Buffer.from([2])});
}
