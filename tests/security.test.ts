import { test } from 'node:test';
import assert from 'node:assert/strict';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifySignature, walletSchema } from '../lib/auth';
import { encrypt, decrypt, secretEquals } from '../lib/crypto';
test('wallet proof rejects amount tampering and another signer',()=>{
  const pair=nacl.sign.keyPair(),other=nacl.sign.keyPair();
  const message='Redeem $5.00 on Perks: nonce\nBrand: Steam\nIssued: 2026-09-18T00:00:00Z';
  const signature=bs58.encode(nacl.sign.detached(new TextEncoder().encode(message),pair.secretKey));
  assert.doesNotThrow(()=>verifySignature(bs58.encode(pair.publicKey),message,signature));
  assert.throws(()=>verifySignature(bs58.encode(pair.publicKey),message.replace('$5.00','$50.00'),signature));
  assert.throws(()=>verifySignature(bs58.encode(other.publicKey),message,signature));
  assert.throws(()=>verifySignature(bs58.encode(pair.publicKey),message,'invalid'));
});
test('invalid wallets are not admitted',()=>{assert.equal(walletSchema.safeParse('not-a-wallet').success,false);});
test('voucher encryption is randomized, authenticated, and lossless',()=>{
  process.env.VOUCHER_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
  const card={cardNumber:'SECRET-123',pinCode:'9911'};
  const first=encrypt(card),second=encrypt(card);
  assert.notEqual(first,second);assert.deepEqual(decrypt(first),card);assert.ok(!first.includes('SECRET'));
  const bytes=Buffer.from(first,'base64');bytes[30]^=1;assert.throws(()=>decrypt(bytes.toString('base64')));
  assert.equal(secretEquals('abc','abc'),true);assert.equal(secretEquals('abc','ab'),false);
});
