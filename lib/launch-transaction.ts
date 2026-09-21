import {Keypair,Message,PublicKey,Transaction} from '@solana/web3.js';
export function launchSignatureDiagnostic(encoded:string,message:string){
  try{
    const received=Transaction.from(Buffer.from(encoded,'base64'));
    const expected=Transaction.populate(Message.from(Buffer.from(message,'base64')));
    const describe=(tx:Transaction)=>tx.instructions.map(ix=>({program:ix.programId.toBase58(),data:ix.data.toString('base64'),accounts:ix.keys.map(k=>[k.pubkey.toBase58(),k.isSigner,k.isWritable])}));
    const a=describe(expected),b=describe(received);
    return {messageMatches:received.serializeMessage().toString('base64')===message,feePayerMatches:received.feePayer?.equals(expected.feePayer!)??false,blockhashMatches:received.recentBlockhash===expected.recentBlockhash,instructionsMatch:JSON.stringify(a)===JSON.stringify(b),expectedPrograms:a.map(ix=>ix.program),receivedPrograms:b.map(ix=>ix.program),presentSignatures:received.signatures.map(s=>({payer:s.publicKey.equals(received.feePayer!),present:!!s.signature})),providedSignaturesValid:received.verifySignatures(false)};
  }catch{return {parseFailed:true};}
}
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
  if(!tx.verifySignatures())throw new Error('Final signature verification failed');
  return tx;
}
