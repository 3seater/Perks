import {test} from 'node:test';
import assert from 'node:assert/strict';
import {perksPositions} from '../lib/profile-positions';
test('Positions include only held Perks coins, including coins launched by other wallets',()=>{
  const tokens=[{mintAddress:'perks',name:'Perks coin',symbol:'PERK',imageUrl:'image'},{mintAddress:'sold',name:'Sold coin',symbol:'SOLD',imageUrl:'image'}];
  const result=perksPositions(tokens,[{mint:'other',amount:'999999',decimals:6},{mint:'perks',amount:'1000000',decimals:6},{mint:'perks',amount:'230000',decimals:6},{mint:'sold',amount:'0',decimals:6}]);
  assert.equal(result.length,1);assert.equal(result[0].mint,'perks');assert.equal(result[0].amount,'1.23');assert.equal(result[0].name,'Perks coin');
});
test('Position amounts retain exact small fractions and integer trailing zeroes',()=>{
  const token={mintAddress:'perks',name:'Test',symbol:'TEST',imageUrl:''};
  assert.equal(perksPositions([token],[{mint:'perks',amount:'1',decimals:9}])[0].amount,'0.000000001');
  assert.equal(perksPositions([token],[{mint:'perks',amount:'100',decimals:0}])[0].amount,'100');
});
