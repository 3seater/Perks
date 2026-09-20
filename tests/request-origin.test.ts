import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedRequestOrigin as allowed} from '../lib/request-origin';
const configured='http://[::1]:3000';
test('Local pilot accepts same-host localhost, IPv4 and IPv6 development origins',()=>{
  for(const host of ['localhost:3000','127.0.0.1:3000','[::1]:3000'])assert.equal(allowed(`http://${host}`,configured,host,'development'),true);
});
test('Origin check rejects other sites, ports, protocols, malformed origins and cross-host requests',()=>{
  for(const origin of [null,'null','https://evil.example','http://localhost.evil.example:3000','http://localhost:3001','https://localhost:3000','http://localhost:3000/path','http://localhost:3000/'])assert.equal(allowed(origin,configured,'localhost:3000','development'),false);
  assert.equal(allowed('http://localhost:3000',configured,'[::1]:3000','development'),false);
});
test('Production and deployed origins remain exact-match only',()=>{
  assert.equal(allowed(configured,configured,'[::1]:3000','production'),true);
  assert.equal(allowed('http://localhost:3000',configured,'localhost:3000','production'),false);
  assert.equal(allowed('http://localhost:3000','https://perks.example','localhost:3000','development'),false);
  assert.equal(allowed('https://perks.example','https://perks.example','perks.example','production'),true);
});
