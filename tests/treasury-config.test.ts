import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PublicKey } from '@solana/web3.js';
import { creatorRecipientFromConfig } from '../lib/treasury-config';

const treasury = 'Ck1GCSBQZgup9mZJkZ3wT8HqZdRk8uiTSgFje5KxYpLK';
test('wallet custody uses the designated treasury, independent of the launching trader', () => {
  assert.equal(creatorRecipientFromConfig({PERKS_CUSTODY_MODE:'wallet',PERKS_TREASURY_ADDRESS:treasury}).toBase58(),treasury);
  assert.throws(()=>creatorRecipientFromConfig({PERKS_CUSTODY_MODE:'wallet'}));
  assert.throws(()=>creatorRecipientFromConfig({PERKS_CUSTODY_MODE:'wallet',PERKS_TREASURY_ADDRESS:PublicKey.default.toBase58()}));
  assert.throws(()=>creatorRecipientFromConfig({PERKS_TREASURY_ADDRESS:treasury}));
});
test('PDA custody rejects a wallet substituted for its derived vault', () => {
  const program = new PublicKey(treasury);
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from('perks-vault')],program);
  const env = {PERKS_CUSTODY_MODE:'pda',PERKS_VAULT_PROGRAM_ID:treasury,PERKS_VAULT_ADDRESS:pda.toBase58()};
  assert.equal(creatorRecipientFromConfig(env).toBase58(),pda.toBase58());
  assert.throws(()=>creatorRecipientFromConfig({...env,PERKS_VAULT_ADDRESS:treasury}));
  assert.throws(()=>creatorRecipientFromConfig({PERKS_CUSTODY_MODE:'wallet',PERKS_TREASURY_ADDRESS:pda.toBase58()}));
});
