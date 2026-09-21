import {Keypair,PublicKey,Transaction} from '@solana/web3.js';
// Keep the mint signature server-side so the wallet receives an unsigned
// transaction and can simulate it before any other signature is attached.
export function prepareWalletFirstLaunch(tx:Transaction,mint:Keypair){
  tx.partialSign(mint);
  const entry=tx.signatures.find(s=>s.publicKey.equals(mint.publicKey));
  if(!entry?.signature)throw new Error('Missing mint signature');
  const signature=entry.signature.toString('base64');
  entry.signature=null;
  return signature;
}
export function verifyPreparedLaunch(encoded:string,message:string,mintSignature?:{publicKey:string;signature:string}){
  const tx=Transaction.from(Buffer.from(encoded,'base64'));
  if(tx.serializeMessage().toString('base64')!==message)throw new Error('Signed transaction does not match the prepared launch');
  if(mintSignature){
    const mint=new PublicKey(mintSignature.publicKey);
    const payerSignature=tx.signatures.find(s=>s.publicKey.equals(tx.feePayer!));
    if(mint.equals(tx.feePayer!)||!payerSignature?.signature||!tx.verifySignatures(false))throw new Error('Missing or invalid wallet approval');
    tx.addSignature(mint,Buffer.from(mintSignature.signature,'base64'));
  }
  if(!tx.verifySignatures())throw new Error('Signed transaction does not match the prepared launch');
  return tx;
}
