export type SignaturePageEntry = {signature:string;slot:number;err:unknown};
type Page = (before?:string)=>Promise<SignaturePageEntry[]>;

/** Page backwards to the previous watermark. A budget limit fails closed. */
export async function discoverActivitySlots(page:Page, afterSlot:number, throughSlot:number, maxPages=20,onActivity?:(entry:SignaturePageEntry)=>void) {
  const slots=new Set<number>(), seen=new Set<string>();
  let before:string|undefined;
  for(let n=0;n<maxPages;n++) {
    const rows=await page(before);
    if(!rows.length)return [...slots].sort((a,b)=>a-b);
    let boundary=false, previous=Infinity;
    for(const row of rows) {
      if(!Number.isSafeInteger(row.slot)||row.slot<0||row.slot>previous||seen.has(row.signature))throw new Error('Invalid or repeated RPC signature page');
      previous=row.slot;seen.add(row.signature);
      if(row.slot<=afterSlot)boundary=true;
      else if(row.slot<=throughSlot&&!row.err){slots.add(row.slot);onActivity?.(row);}
    }
    if(boundary)return [...slots].sort((a,b)=>a-b);
    before=rows[rows.length-1].signature;
  }
  throw new Error('Signature history exceeds this scan budget; watermark was not advanced');
}
