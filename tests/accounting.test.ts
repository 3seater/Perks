import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCALE, increment, settle, debitForCents, centsForLamports } from '../lib/accounting';
test('a newly purchased token cannot claim historic rewards',()=>{
  const index=increment(1000n,100n);
  const sellerAccrued=settle(40n,0n,index,0n);
  const buyerAccrued=settle(40n,index,index,0n);
  assert.equal(sellerAccrued/SCALE,400n);assert.equal(buyerAccrued,0n);
  const next=index+increment(1000n,100n);
  assert.equal(settle(40n,index,next,buyerAccrued)/SCALE,400n);
  assert.equal(settle(0n,index,next,sellerAccrued)/SCALE,400n);
});
test('large supplies and tiny fees never create extra money through rounding',()=>{
  const supply=1_000_000_000_000_000n;
  const index=increment(3n,supply);
  const balances=[supply/3n,supply/3n,supply-2n*(supply/3n)];
  const paid=balances.reduce((sum,b)=>sum+settle(b,0n,index,0n)/SCALE,0n);
  assert.ok(paid<=3n);assert.ok(paid>=1n);
});
test('partial claims preserve the remainder and subsequent accrual',()=>{
  const index=increment(1000n,100n), accrued=settle(25n,0n,index,0n);
  const remainder=accrued-100n*SCALE;
  assert.equal(settle(25n,index,index+increment(400n,100n),remainder)/SCALE,250n);
});
test('$5 claim includes $0.50 and rounds debit up',()=>{
  assert.equal(debitForCents(500,100_000_000n),55_000_000n);
  assert.equal(centsForLamports(55_000_000n,100_000_000n),550);
  const quote=123_456_789n, debit=debitForCents(1000,quote);
  assert.ok(debit*quote>=1050n*10_000n*1_000_000_000n);
  assert.ok((debit-1n)*quote<1050n*10_000n*1_000_000_000n);
});
test('dust, negative, fractional and non-monotonic inputs are rejected',()=>{
  for(const amount of [499,0,-500,500.1])assert.throws(()=>debitForCents(amount,100n));
  assert.throws(()=>increment(100n,0n));assert.throws(()=>increment(-1n,10n));assert.throws(()=>settle(10n,2n,1n,0n));
});
