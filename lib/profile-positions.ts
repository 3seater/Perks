export type PerksToken={mintAddress:string;name:string;symbol:string;imageUrl:string};
export function perksPositions(tokens:PerksToken[],accounts:{mint:string;amount:string;decimals:number}[]){
  const known=new Map(tokens.map(token=>[token.mintAddress,token]));
  const balances=new Map<string,{amount:bigint;decimals:number}>();
  for(const account of accounts){
    if(!known.has(account.mint))continue;
    if(!/^\d+$/.test(account.amount)||!Number.isInteger(account.decimals)||account.decimals<0||account.decimals>255)throw new Error('Invalid token balance');
    const previous=balances.get(account.mint);
    if(previous&&previous.decimals!==account.decimals)throw new Error('Inconsistent token decimals');
    balances.set(account.mint,{amount:(previous?.amount??0n)+BigInt(account.amount),decimals:account.decimals});
  }
  return [...balances].filter(([,value])=>value.amount>0n).map(([mint,{amount,decimals}])=>{
    const padded=amount.toString().padStart(decimals+1,'0');
    const formatted=decimals?`${padded.slice(0,-decimals)}.${padded.slice(-decimals)}`.replace(/\.?0+$/,''):padded;
    return {mint,amount:formatted,...known.get(mint)!};
  });
}
