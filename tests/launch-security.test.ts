import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Keypair,SystemProgram,Transaction} from '@solana/web3.js';
import {intentHash} from '../lib/launch-access';
import {prepareWalletFirstLaunch,verifyPreparedLaunch} from '../lib/launch-transaction';
test('Launch intent binds wallet, metadata, image and initial buy',()=>{
  const input={wallet:Keypair.generate().publicKey.toBase58(),name:'Example',symbol:'ex',description:'Example token',imageHash:'a'.repeat(64),initialBuySol:'0.001'};
  const hash=intentHash(input);
  assert.notEqual(hash,intentHash({...input,symbol:'EX'}));
  for(const changed of [{wallet:Keypair.generate().publicKey.toBase58()},{name:'Different'},{description:'Changed'},{imageHash:'b'.repeat(64)},{initialBuySol:'1'}])assert.notEqual(hash,intentHash({...input,...changed}));
});
test('Wallet sees no prior signatures; relay adds the mint signature only after wallet approval',()=>{
  const payer=Keypair.generate(),mint=Keypair.generate();
  const tx=new Transaction({feePayer:payer.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58()}).add(SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,lamports:1,space:0,programId:SystemProgram.programId}));
  const mintSignature={publicKey:mint.publicKey.toBase58(),signature:prepareWalletFirstLaunch(tx,mint)};
  const message=tx.serializeMessage().toString('base64');
  const walletTx=Transaction.from(tx.serialize({requireAllSignatures:false}));
  assert.ok(walletTx.signatures.every(entry=>entry.signature===null));
  assert.throws(()=>verifyPreparedLaunch(walletTx.serialize({requireAllSignatures:false}).toString('base64'),message,mintSignature));
  walletTx.partialSign(payer);
  const encoded=walletTx.serialize({requireAllSignatures:false}).toString('base64');
  assert.throws(()=>verifyPreparedLaunch(encoded,message,{...mintSignature,signature:Buffer.alloc(64).toString('base64')}));
  const complete=verifyPreparedLaunch(encoded,message,mintSignature);
  assert.equal(complete.serializeMessage().toString('base64'),message);
  assert.ok(complete.verifySignatures());
  walletTx.instructions[0]=SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,lamports:2,space:0,programId:SystemProgram.programId});
  walletTx.partialSign(payer);
  assert.throws(()=>verifyPreparedLaunch(walletTx.serialize({requireAllSignatures:false}).toString('base64'),message,mintSignature));
});
test('Launch relay refuses unsigned transactions and any changed message',()=>{
  const payer=Keypair.generate(),recipient=Keypair.generate().publicKey;
  const tx=new Transaction({feePayer:payer.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58()}).add(SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:recipient,lamports:1}));
  const message=tx.serializeMessage().toString('base64');
  assert.throws(()=>verifyPreparedLaunch(tx.serialize({requireAllSignatures:false}).toString('base64'),message));
  tx.sign(payer);assert.ok(verifyPreparedLaunch(tx.serialize().toString('base64'),message));
  tx.instructions[0]=SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:recipient,lamports:2});tx.sign(payer);
  assert.throws(()=>verifyPreparedLaunch(tx.serialize().toString('base64'),message));
});
