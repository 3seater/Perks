import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { reloadly } from '../lib/reloadly';
import { dispatch } from '../lib/orders';
test('concurrent dispatch and a timed-out provider request never issue a second POST',async ()=>{
  let status='RESERVED',calls=0;
  const store={updateMany:async (args:{where:{status:unknown};data:{status:string}})=>{
    if(args.where.status==='RESERVED' && status!=='RESERVED')return {count:0};
    status=args.data.status;return {count:1};
  },findUniqueOrThrow:async()=>({id:'order-1',productId:123,amountCents:500,customIdentifier:'perks_claim_stable',status,reloadlyOrderId:null})} as unknown as typeof db.redemptionOrder;
  const provider={...reloadly,order:async()=>{calls++;throw new Error('network timeout after provider accepted order');}};
  await Promise.all([dispatch('order-1',store,provider),dispatch('order-1',store,provider)]);
  assert.equal(calls,1);assert.equal(status,'RECONCILING');
  await dispatch('order-1',store,provider);assert.equal(calls,1);assert.equal(status,'RECONCILING');
});
