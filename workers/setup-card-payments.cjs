// One-time local setup. Never prints private keys or the encryption key.
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {Keypair}=require('@solana/web3.js');
require('@next/env').loadEnvConfig(process.cwd());
const directory=path.resolve('.secrets');
fs.mkdirSync(directory,{recursive:true,mode:0o700});
if(process.platform==='win32'){
  const owner=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
  execFileSync('icacls',[directory,'/inheritance:r','/grant:r',`${owner}:(OI)(CI)F`],{stdio:'ignore',windowsHide:true});
}
const keyPath=process.env.CARD_PAYMENT_KEYPAIR_PATH||path.join(directory,'card-payment-wallet.json');
let signer;
if(fs.existsSync(keyPath))signer=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath,'utf8'))));
else{signer=Keypair.generate();fs.writeFileSync(keyPath,JSON.stringify(Array.from(signer.secretKey)),{flag:'wx',mode:0o600});}
const envPath=path.resolve('.env.local');let env=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):'';
const values={CARD_PAYMENT_PUBLIC_KEY:signer.publicKey.toBase58(),CARD_PAYMENT_FEE_CAP_LAMPORTS:'10000',CARD_MAX_ORDER_LAMPORTS:'100000000',CARD_MAX_DAILY_LAMPORTS:'500000000',CARD_REDEMPTIONS_ENABLED:'true',AUTO_COLLECTION_ENABLED:'true',AUTO_COLLECTION_MIN_LAMPORTS:'1000000',AUTO_REFILL_TARGET_LAMPORTS:'100000000'};
if(!process.env.VOUCHER_ENCRYPTION_KEY)values.VOUCHER_ENCRYPTION_KEY=randomBytes(32).toString('base64');
for(const [key,value] of Object.entries(values)){
  const empty=new RegExp(`^${key}=\\s*$`,'m');
  if(empty.test(env))env=env.replace(empty,`${key}=${value}`);
  else if(!new RegExp(`^${key}=`, 'm').test(env))env+=`\n${key}=${value}`;
}
fs.writeFileSync(envPath,env+'\n');
// The website needs only the public key. Worker-only key path lives separately.
const workerPath=path.join(directory,'card-worker.json');
const oldWorker=fs.existsSync(workerPath)?JSON.parse(fs.readFileSync(workerPath,'utf8')):{};
fs.writeFileSync(workerPath,JSON.stringify({...oldWorker,keyPath},null,2),{mode:0o600});
console.log('Payment wallet:',signer.publicKey.toBase58());
console.log('Private signing material stays in .secrets. Back up that folder securely.');
console.log('Run: node --import tsx workers/card-payments.ts');
console.log('Checkout becomes available after the worker is running and this wallet is funded.');
