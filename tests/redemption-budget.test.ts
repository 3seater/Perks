import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redemptionBudget} from '../lib/redemption-budget';
import {lotBalance,rewardShare} from '../lib/trade-accounting';
test('95% rewards remain backed with a separate 5% buffer',()=>{
  const fee=1_000_000n,reward=rewardShare(fee,9500);
  assert.equal(reward,950_000n);
  assert.equal(fee-reward,50_000n);
  assert.equal(lotBalance({fee,collected:0n,reserved:0n,spent:0n,bps:9500}).available,0n);
});
test('Card budget includes payment cost, expiry and other users liabilities',()=>{
  const quote={providerLamports:940_000n,paymentFeeLamports:10_000n,availableLamports:950_000n,treasuryLamports:2_000_000n,otherLiabilitiesLamports:1_000_000n,quoteExpiresAt:200};
  assert.equal(redemptionBudget(quote,100).debitLamports,950_000n);
  assert.throws(()=>redemptionBudget({...quote,paymentFeeLamports:10_001n},100));
  assert.throws(()=>redemptionBudget({...quote,treasuryLamports:1_949_999n},100));
  assert.throws(()=>redemptionBudget(quote,200));
});
