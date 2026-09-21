import {ComputeBudgetProgram,Keypair,Message,PublicKey,Transaction,type TransactionInstruction} from '@solana/web3.js';
const LIGHTHOUSE=new PublicKey('L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95');
function sameInstruction(a:TransactionInstruction,b:TransactionInstruction){
  return a.programId.equals(b.programId)&&a.data.equals(b.data)&&a.keys.length===b.keys.length&&a.keys.every((key,i)=>key.pubkey.equals(b.keys[i].pubkey)&&key.isSigner===b.keys[i].isSigner&&key.isWritable===b.keys[i].isWritable);
}
function verifyWalletAdditions(tx:Transaction,message:string){
  const originalMessage=Message.from(Buffer.from(message,'base64'));
  const original=Transaction.populate(originalMessage),signed=tx.compileMessage();
  if(!tx.feePayer?.equals(original.feePayer!)||tx.recentBlockhash!==original.recentBlockhash)throw new Error('Launch payer or blockhash changed');
  const signers=(value:Message)=>value.accountKeys.slice(0,value.header.numRequiredSignatures).map(key=>key.toBase58()).sort().join(',');
  if(signers(signed)!==signers(originalMessage))throw new Error('Launch signers changed');
  const expected=original.instructions.filter(ix=>!ix.programId.equals(ComputeBudgetProgram.programId));
  const actual:TransactionInstruction[]=[];
  let limit=0,price=0n,limitCount=0,priceCount=0,assertions=0;
  for(const ix of tx.instructions){
    if(ix.programId.equals(ComputeBudgetProgram.programId)){
      if(ix.keys.length||actual.length)throw new Error('Unexpected compute instruction');
      if(ix.data[0]===2&&ix.data.length===5){limit=ix.data.readUInt32LE(1);limitCount++;}
      else if(ix.data[0]===3&&ix.data.length===9){price=ix.data.readBigUInt64LE(1);priceCount++;}
      else throw new Error('Unsupported compute instruction');
    }else if(ix.programId.equals(LIGHTHOUSE)){
      // Lighthouse variants 2..15 only assert state. Exclude MemoryWrite,
      // MemoryClose and CPI-based Merkle assertions. Never grant new privileges.
      if(++assertions>3||ix.data.length<2||ix.data[0]<2||ix.data[0]>15)throw new Error('Unsupported wallet assertion');
      for(const key of ix.keys){
        const i=originalMessage.accountKeys.findIndex(address=>address.equals(key.pubkey));
        if((key.isSigner&&(i<0||!originalMessage.isAccountSigner(i)))||(key.isWritable&&(i<0||!originalMessage.isAccountWritable(i))))throw new Error('Wallet assertion expanded account access');
      }
    }else actual.push(ix);
  }
  if(limitCount!==1||limit<1||limit>1_400_000||priceCount>1||(BigInt(limit)*price+999999n)/1000000n>1_000_000n)throw new Error('Launch network fee exceeds permitted limits');
  if(actual.length!==expected.length||!actual.every((ix,i)=>sameInstruction(ix,expected[i])))throw new Error('Token launch instructions changed');
}
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
export function verifyPreparedLaunch(encoded:string,message:string,mintSignature?:{publicKey:string;signature:string},mintSigner?:Keypair){
  const tx=Transaction.from(Buffer.from(encoded,'base64'));
  if(mintSigner){
    verifyWalletAdditions(tx,message);
    if(mintSigner.publicKey.equals(tx.feePayer!)||!tx.signatures.some(s=>s.publicKey.equals(mintSigner.publicKey))||!tx.signatures.find(s=>s.publicKey.equals(tx.feePayer!))?.signature||!tx.verifySignatures(false))throw new Error('Missing or invalid wallet approval');
    // Sign the exact wallet-approved message, including its safety assertions.
    tx.partialSign(mintSigner);
    if(!tx.verifySignatures())throw new Error('Final signature verification failed');
    return tx;
  }
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
