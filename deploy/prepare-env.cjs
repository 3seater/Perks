// Prepare locally; never prints secrets, enables transactions or uploads data.
const fs=require('node:fs');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const output=path.resolve('.env.production');
if(fs.existsSync(output))throw Error('.env.production already exists; refusing to overwrite.');
const template=fs.readFileSync(path.join(__dirname,'production.env.example'),'utf8');
const preserve=new Set(['SOLANA_RPC_URL','PERKS_TREASURY_ADDRESS','REWARD_BPS','INDEXER_START_SLOT','INDEXER_MAX_LAG_SLOTS','METADATA_PROVIDER','PINATA_JWT','PINATA_GATEWAY','CRYPTOREFILLS_PARTNER_ID','CARD_PAYMENT_PUBLIC_KEY','CARD_PAYMENT_FEE_CAP_LAMPORTS','CARD_MAX_ORDER_LAMPORTS','CARD_MAX_DAILY_LAMPORTS','AUTO_COLLECTION_MIN_LAMPORTS','AUTO_REFILL_TARGET_LAMPORTS','TREASURY_RESERVE_LAMPORTS','VOUCHER_ENCRYPTION_KEY','JUPITER_API_KEY','HELIUS_WEBHOOK_SECRET']);
const result=template.split(/\r?\n/).map(line=>{
  const match=/^([A-Z0-9_]+)=/.exec(line);if(!match)return line;
  const name=match[1];
  const value=name==='POSTGRES_PASSWORD'?randomBytes(32).toString('hex'):preserve.has(name)?process.env[name]:undefined;
  if(!value)return line;
  if(/[\r\n']/u.test(value))throw Error('Unsupported characters in '+name+'; set it manually.');
  return name+"='"+value+"'";
}).join('\n');
fs.writeFileSync(output,result,{flag:'wx',mode:0o600});
console.log('Prepared ignored .env.production. Launches and payments remain paused.');
console.log('Configure production Turnstile keys before rebuilding for public launches.');
console.log('Existing local settings and database were not changed.');
