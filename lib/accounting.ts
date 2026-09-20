export const SCALE = 10n ** 18n;
export const integer = (n: {toString(): string} | string | bigint) => BigInt(n.toString());
export function settle(balance: bigint, oldIndex: bigint, newIndex: bigint, accrued: bigint) {
  if (newIndex < oldIndex || balance < 0n) throw new Error('Invalid ledger state');
  return accrued + balance * (newIndex - oldIndex);
}
export function increment(fee: bigint, supply: bigint) {
  if (fee < 0n || supply <= 0n) throw new Error('Invalid fee or supply');
  return fee * SCALE / supply;
}
export function debitForCents(cents: number, solMicroUsd: bigint) {
  if (!Number.isSafeInteger(cents) || cents < 500 || solMicroUsd <= 0n) throw new Error('Invalid redemption');
  // $0.50 disclosed service fee; round required lamports upward.
  const numerator = BigInt(cents + 50) * 10_000n * 1_000_000_000n;
  return (numerator + solMicroUsd - 1n) / solMicroUsd;
}
export const centsForLamports = (lamports: bigint, solMicroUsd: bigint) => Number(lamports * solMicroUsd / 10_000_000_000_000n);
