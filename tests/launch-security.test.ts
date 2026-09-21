import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ComputeBudgetProgram,Keypair,PublicKey,SystemProgram,Transaction,TransactionInstruction} from '@solana/web3.js';
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
test('Wallet priority fee and read-only assertions preserve approved launch contents',()=>{
  const payer=Keypair.generate(),mint=Keypair.generate();
  const original=new Transaction({feePayer:payer.publicKey,recentBlockhash:Keypair.generate().publicKey.toBase58()}).add(
    ComputeBudgetProgram.setComputeUnitLimit({units:500000}),
    SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,lamports:1,space:0,programId:SystemProgram.programId})
  );
  const message=original.serializeMessage().toString('base64');
  const make=()=>{
    const tx=Transaction.from(original.serialize({requireAllSignatures:false}));
    tx.instructions.splice(1,0,ComputeBudgetProgram.setComputeUnitPrice({microLamports:1000}));
    tx.add(new TransactionInstruction({programId:new PublicKey('L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95'),keys:[{pubkey:payer.publicKey,isSigner:true,isWritable:true}],data:Buffer.from([6,0,0])}));
    return tx;
  };
  const encode=(tx:Transaction)=>{tx.partialSign(payer);return tx.serialize({requireAllSignatures:false}).toString('base64');};
  const approved=make(),signed=encode(approved);
  const complete=verifyPreparedLaunch(signed,message,undefined,mint);
  assert.ok(complete.verifySignatures());
  assert.equal(complete.serializeMessage().toString('base64'),approved.serializeMessage().toString('base64'));
  const changed=make();changed.instructions[2]=SystemProgram.createAccount({fromPubkey:payer.publicKey,newAccountPubkey:mint.publicKey,lamports:2,space:0,programId:SystemProgram.programId});
  assert.throws(()=>verifyPreparedLaunch(encode(changed),message,undefined,mint));
  const transfer=make();transfer.add(SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:Keypair.generate().publicKey,lamports:1}));
  assert.throws(()=>verifyPreparedLaunch(encode(transfer),message,undefined,mint));
  const write=make();write.instructions[3].data=Buffer.from([0,0,0]);
  assert.throws(()=>verifyPreparedLaunch(encode(write),message,undefined,mint));
  const highFee=make();highFee.instructions[1]=ComputeBudgetProgram.setComputeUnitPrice({microLamports:1_000_000_000});
  assert.throws(()=>verifyPreparedLaunch(encode(highFee),message,undefined,mint));
  const unsigned=make();assert.throws(()=>verifyPreparedLaunch(unsigned.serialize({requireAllSignatures:false}).toString('base64'),message,undefined,mint));
  assert.throws(()=>verifyPreparedLaunch(signed,message,undefined,Keypair.generate()));
});
