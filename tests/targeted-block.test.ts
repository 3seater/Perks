import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {VersionedTransactionResponse} from '@solana/web3.js';
import {targetedBlock} from '../lib/targeted-block';
const tx=(signature:string,slot=10)=>({slot,transaction:{signatures:[signature]},meta:{err:null},version:'legacy'} as VersionedTransactionResponse);
test('Targeted reader preserves canonical order and never decodes unrelated newer transactions',async()=>{
  const fetched:string[]=[];
  const result=await targetedBlock(10,['unrelated-v1','launch','trade','collection'],new Set(['collection','trade','launch']),async signature=>{fetched.push(signature);return tx(signature);});
  assert.deepEqual(fetched,['launch','trade','collection']);
  assert.deepEqual(result.transactions.map(item=>item.transaction.signatures[0]),fetched);
});
test('Targeted reader refuses missing or inconsistent finalized evidence',async()=>{
  await assert.rejects(targetedBlock(10,['launch'],new Set(['missing']),async signature=>tx(signature)),/missing/);
  await assert.rejects(targetedBlock(10,['launch'],new Set(['launch']),async()=>null),/missing/);
  await assert.rejects(targetedBlock(10,['launch'],new Set(['launch']),async()=>tx('launch',11)),/mismatched/);
  await assert.rejects(targetedBlock(10,['launch'],new Set(['launch']),async()=>tx('different')),/mismatched/);
});
