import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ipfsImagePath,imageMime} from '../lib/token-image';
const cid='bafybeigus5ak6qn2rkueyuiryhxqyb7mdc3bxmgv4iff6yhesvqibk3j6e';
test('Artwork resolver accepts immutable IPFS sources and rejects arbitrary server fetches',()=>{
  assert.equal(ipfsImagePath(`https://ipfs.io/ipfs/${cid}`),cid);
  assert.equal(ipfsImagePath(`ipfs://${cid}`),cid);
  for(const source of ['http://127.0.0.1/image','https://evil.example/image',`https://ipfs.io/ipfs/${cid}?url=private`,`https://ipfs.io/ipfs/${cid}/../../private`,`https://name:pass@ipfs.io/ipfs/${cid}`])assert.throws(()=>ipfsImagePath(source));
});
test('Artwork response validates file bytes rather than trusting the remote content type',()=>{
  assert.equal(imageMime(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
  assert.throws(()=>imageMime(new TextEncoder().encode('<html>Gateway error</html>')));
});
