/** Short display only; the ledger keeps every lamport. */
export function formatRewardSol(value:string) {
  const lamports=BigInt(value);
  if(lamports>0n&&lamports<100000n)return '<0.0001';
  const units=lamports/100000n;
  const whole=(units/10000n).toLocaleString('en-US');
  const fraction=(units%10000n).toString().padStart(4,'0').replace(/0+$/,'');
  return fraction?`${whole}.${fraction}`:whole;
}
