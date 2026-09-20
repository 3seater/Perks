import type {VersionedTransactionResponse,VersionedBlockResponse} from '@solana/web3.js';
/** Keep canonical block order without decoding unrelated transaction versions. */
export async function targetedBlock(slot:number,blockSignatures:string[],relevant:Set<string>,fetchTransaction:(signature:string)=>Promise<VersionedTransactionResponse|null>):Promise<Pick<VersionedBlockResponse,'transactions'>>{
  if(new Set(blockSignatures).size!==blockSignatures.length)throw new Error('Duplicate block signatures');
  const ordered=blockSignatures.filter(signature=>relevant.has(signature));
  if(ordered.length!==relevant.size)throw new Error('Discovered transaction missing from finalized block');
  const transactions:VersionedBlockResponse['transactions']=[];
  for(const signature of ordered){
    const tx=await fetchTransaction(signature);
    if(!tx||tx.slot!==slot||tx.transaction.signatures[0]!==signature||!tx.meta)throw new Error('Finalized transaction evidence is missing or mismatched');
    transactions.push({transaction:tx.transaction,meta:tx.meta,version:tx.version});
  }
  return {transactions};
}
