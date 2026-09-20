import {Transaction} from '@solana/web3.js';
export function verifyPreparedLaunch(encoded:string,message:string){
  const tx=Transaction.from(Buffer.from(encoded,'base64'));
  if(tx.serializeMessage().toString('base64')!==message||!tx.verifySignatures())throw new Error('Signed transaction does not match the prepared launch');
  return tx;
}
