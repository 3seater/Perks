// Pure integer math shared by the persistent ledger and invariant tests.
export function rewardShare(fee: bigint, bps: number): bigint {
  if (fee < 0n || !Number.isInteger(bps) || bps < 0 || bps >= 10000)
    throw new Error('Reward rate must be between 0 and 9999 basis points');
  return fee * BigInt(bps) / 10000n;
}

export type LotAmounts = {
  fee: bigint; collected: bigint; reserved: bigint; spent: bigint; bps: number;
};
export function lotBalance(lot: LotAmounts) {
  const earned = rewardShare(lot.fee, lot.bps);
  if (lot.collected < 0n || lot.collected > lot.fee || lot.reserved < 0n || lot.spent < 0n)
    throw new Error('Invalid reward lot');
  const funded = rewardShare(lot.collected, lot.bps);
  const remaining = earned - lot.reserved - lot.spent;
  if (remaining < 0n) throw new Error('Reward lot is overdrawn');
  // Operator-prefunded redemptions may spend earnings before collection.
  // Collection changes backing, never the total remaining entitlement.
  const backed = funded - lot.reserved - lot.spent;
  const available = backed > 0n ? backed : 0n;
  return {pending: remaining - available, available, reserved: lot.reserved, spent: lot.spent};
}

export function allocateAvailable<T extends {id: string; available: bigint}>(rows: T[], amount: bigint) {
  if (amount <= 0n) throw new Error('Reservation must be positive');
  let remaining = amount;
  const allocations: {lotId: string; lamports: bigint}[] = [];
  for (const row of rows) {
    if (row.available < 0n) throw new Error('Invalid available balance');
    const take = row.available < remaining ? row.available : remaining;
    if (take > 0n) allocations.push({lotId:row.id, lamports:take});
    remaining -= take;
  }
  if (remaining !== 0n) throw new Error('Insufficient collected rewards');
  return allocations;
}

// Require the protocol's user to be an actual transaction signer. Router PDAs
// remain unresolved; never substitute the fee payer or a guessed token owner.
export function attributeTrader(user: string, signers: string[]) {
  return signers.includes(user) ? user : null;
}
