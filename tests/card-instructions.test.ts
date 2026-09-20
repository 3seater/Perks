import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cardInstructionText} from '../lib/card-instructions';

test('provider instructions become readable paragraphs and lists, without executable markup',()=>{
  assert.equal(cardInstructionText('<p>Redeem at Target.com:</p><p>Enter your card.<br>Use your PIN &amp; code.</p>'),'Redeem at Target.com:\n\nEnter your card.\nUse your PIN & code.');
  assert.equal(cardInstructionText('<script>alert(1)</script><style>p{color:red}</style><ul><li>First</li><li>Second &#8212; done</li></ul>'),'• First\n\n• Second — done');
  assert.equal(cardInstructionText('<img src=x onerror=alert(1)>Safe&nbsp;text'),'Safe text');
});
