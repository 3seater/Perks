import { PublicKey } from '@solana/web3.js';

type TreasuryEnvironment = Record<string, string | undefined>;

/** Resolve the creator-fee destination from server configuration, never launch input. */
export function creatorRecipientFromConfig(env: TreasuryEnvironment): PublicKey {
  if (env.PERKS_CUSTODY_MODE === 'wallet') {
    if (!env.PERKS_TREASURY_ADDRESS) throw new Error('Missing PERKS_TREASURY_ADDRESS');
    const address = new PublicKey(env.PERKS_TREASURY_ADDRESS);
    if (address.equals(PublicKey.default) || !PublicKey.isOnCurve(address.toBytes())) {
      throw new Error('Wallet custody requires a nonzero on-curve treasury address');
    }
    return address;
  }
  if (env.PERKS_CUSTODY_MODE !== 'pda') throw new Error('Explicit PERKS_CUSTODY_MODE required');
  if (!env.PERKS_VAULT_ADDRESS || !env.PERKS_VAULT_PROGRAM_ID) throw new Error('Missing vault configuration');
  const address = new PublicKey(env.PERKS_VAULT_ADDRESS);
  const [expected] = PublicKey.findProgramAddressSync([Buffer.from('perks-vault')], new PublicKey(env.PERKS_VAULT_PROGRAM_ID));
  if (!address.equals(expected)) throw new Error('Vault PDA does not match program');
  return address;
}
