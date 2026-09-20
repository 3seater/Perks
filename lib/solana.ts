import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, AccountLayout } from '@solana/spl-token';
import { required, HttpError } from './config';
import { creatorRecipientFromConfig } from './treasury-config';
let connection: Connection;
export const rpc = () => connection ??= new Connection(required('SOLANA_RPC_URL'), 'finalized');
export const creatorRecipient = () => creatorRecipientFromConfig(process.env);
export function vault() {
  if (process.env.PERKS_CUSTODY_MODE !== 'pda') throw new Error('Legacy vault operations require explicit PDA custody');
  const address = new PublicKey(required('PERKS_VAULT_ADDRESS'));
  const [derived] = PublicKey.findProgramAddressSync([Buffer.from('perks-vault')], new PublicKey(required('PERKS_VAULT_PROGRAM_ID')));
  if (!address.equals(derived)) throw new Error('Vault PDA does not match program');
  return address;
}
export async function snapshot(wallet: string, minContextSlot: number) {
  const balances = new Map<string, bigint>();
  const responses = await Promise.all([TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(programId => rpc().getTokenAccountsByOwner(new PublicKey(wallet), {programId}, {commitment: 'finalized', minContextSlot})));
  for (const response of responses) for (const item of response.value) {
    const info = AccountLayout.decode(item.account.data);
    const mint = info.mint.toBase58();
    balances.set(mint, (balances.get(mint) ?? 0n) + info.amount);
  }
  if (responses.some(r => r.context.slot < minContextSlot)) throw new HttpError(503, 'RPC snapshot is behind the ledger.');
  return balances;
}
