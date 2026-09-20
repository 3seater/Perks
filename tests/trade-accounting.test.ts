import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateAvailable, attributeTrader, lotBalance, rewardShare } from '../lib/trade-accounting';
import { live } from '../lib/config';

test('uncollected fees are pending and cannot fund a claim', () => {
  const b = lotBalance({fee:1000n,collected:0n,reserved:0n,spent:0n,bps:8000});
  assert.deepEqual(b,{pending:800n,available:0n,reserved:0n,spent:0n});
  assert.throws(()=>allocateAvailable([{id:'trade',available:b.available}],1n));
});

test('partial collection, reservation, spending and release conserve each earned lamport', () => {
  // Example rates are test inputs, not a production reward policy.
  for (const bps of [0,1,3333,8000,9999]) {
    for (let fee=0n;fee<251n;fee++) {
      for (const collected of [0n,fee/3n,fee]) {
        const funded=rewardShare(collected,bps), reserved=funded/3n, spent=funded/4n;
        const b=lotBalance({fee,collected,reserved,spent,bps});
        assert.equal(b.pending+b.available+b.reserved+b.spent,rewardShare(fee,bps));
        assert.ok(b.available+b.reserved+b.spent<=collected);
        const released=lotBalance({fee,collected,reserved:0n,spent,bps});
        assert.equal(released.available,b.available+reserved);
      }
    }
  }
});

test('rounding partial receipts cumulatively matches one full receipt', () => {
  const fee=10007n,bps=7319;
  let previous=0n,credited=0n;
  for(let collected=1n;collected<=fee;collected++) {
    const funded=rewardShare(collected,bps);
    credited+=funded-previous;previous=funded;
  }
  assert.equal(credited,rewardShare(fee,bps));
  assert.ok(credited<fee);
});

test('one reservation can span tokens without rounding or changing the source rows', () => {
  const rows=[{id:'buy-A',available:11n},{id:'sell-B',available:7n}];
  assert.deepEqual(allocateAvailable(rows,15n),[{lotId:'buy-A',lamports:11n},{lotId:'sell-B',lamports:4n}]);
  assert.equal(rows[0].available,11n);
  assert.throws(()=>allocateAvailable(rows,19n));
});

test('invalid accounting states and full-fee promises are rejected', () => {
  for(const bps of [-1,10000,NaN,80.5])assert.throws(()=>rewardShare(100n,bps));
  assert.throws(()=>rewardShare(-1n,8000));
  assert.throws(()=>lotBalance({fee:10n,collected:11n,reserved:0n,spent:0n,bps:8000}));
  assert.throws(()=>lotBalance({fee:10n,collected:10n,reserved:5n,spent:4n,bps:8000}));
  assert.throws(()=>allocateAvailable([],0n));
});

test('sponsored transactions use the protocol user, not the fee payer; router PDAs are unresolved', () => {
  assert.equal(attributeTrader('trader',['sponsor','trader']),'trader');
  assert.equal(attributeTrader('router-pda',['sponsor','trader']),null);
});

test('the obsolete card flow cannot be enabled by an environment flag', () => {
  const old=process.env.CLAIMS_ENABLED;
  process.env.CLAIMS_ENABLED='true';
  try { assert.throws(()=>live('CLAIMS_ENABLED'),/provider approval/); }
  finally { if(old===undefined)delete process.env.CLAIMS_ENABLED;else process.env.CLAIMS_ENABLED=old; }
});
