// Future fulfillment must reserve this full SOL amount in the shared ledger.
// A face-value USD estimate is never sufficient authorization for a payment.
export function redemptionBudget(input:{providerLamports:bigint;paymentFeeLamports:bigint;availableLamports:bigint;treasuryLamports:bigint;otherLiabilitiesLamports:bigint;quoteExpiresAt:number},now=Date.now()){
  const {providerLamports,paymentFeeLamports,availableLamports,treasuryLamports,otherLiabilitiesLamports,quoteExpiresAt}=input;
  if(providerLamports<=0n||[paymentFeeLamports,availableLamports,treasuryLamports,otherLiabilitiesLamports].some(n=>n<0n))throw new Error('Invalid redemption budget');
  if(!Number.isFinite(quoteExpiresAt)||quoteExpiresAt<=now)throw new Error('Refresh the card quote');
  const debitLamports=providerLamports+paymentFeeLamports;
  if(debitLamports>availableLamports)throw new Error('The full card cost exceeds your funded rewards');
  if(debitLamports+otherLiabilitiesLamports>treasuryLamports)throw new Error('Treasury funding is insufficient');
  return {debitLamports};
}
