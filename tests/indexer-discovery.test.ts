import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverActivitySlots} from '../lib/indexer-discovery';
const row=(signature:string,slot:number,err:unknown=null)=>({signature,slot,err});
test('targeted discovery pages across same-slot trades and excludes failed/future transactions',async()=>{
  const pages=[[row('new',120),row('a',110),row('b',110)],[row('failed',109,{error:true}),row('c',108),row('boundary',100)]];
  let calls=0;
  assert.deepEqual(await discoverActivitySlots(async before=>{if(calls)assert.equal(before,'b');return pages[calls++];},100,115),[108,110]);
  assert.equal(calls,2);
});
test('targeted discovery never claims completeness after truncated or repeated pagination',async()=>{
  await assert.rejects(discoverActivitySlots(async()=>[row('a',110)],100,115,1),/budget/);
  await assert.rejects(discoverActivitySlots(async()=>[row('a',110)],100,115,3),/repeated/);
  assert.deepEqual(await discoverActivitySlots(async()=>[],100,115),[]);
});
