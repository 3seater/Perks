// Read-only local diagnostics. Never print endpoints, credentials or provider errors.
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient} = require('@prisma/client');
const Redis = require('ioredis');
const {PublicKey} = require('@solana/web3.js');
const checks = [];
async function check(name, fn) {
  try { checks.push({check:name,ok:true,detail:await fn()}); }
  catch { checks.push({check:name,ok:false,detail:'Missing configuration, unavailable service, or validation failed'}); }
}
async function main() {
  await check('Live transaction switches', async()=>{
    if (['LAUNCHES_ENABLED','CLAIMS_ENABLED','COLLECTIONS_ENABLED','TREASURY_AUTOSWAP_ENABLED'].some(k=>process.env[k]==='true')) throw Error();
    return 'Launches, claims, collection and legacy automation remain disabled';
  });
  await check('Wallet treasury',async()=>{
    const address=new PublicKey(process.env.PERKS_TREASURY_ADDRESS);
    if(process.env.PERKS_CUSTODY_MODE!=='wallet'||address.equals(PublicKey.default)||!PublicKey.isOnCurve(address.toBytes()))throw Error();
    return address.toBase58();
  });
  await check('Mainnet RPC',async()=>{
    const url=new URL(process.env.SOLANA_RPC_URL);
    if(url.protocol!=='https:')throw Error();
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getGenesisHash'}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error();
    if((await response.json()).result!=='5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d')throw Error();
    return 'Solana mainnet verified';
  });
  await check('PostgreSQL reward schema',async()=>{
    if(!process.env.DATABASE_URL)throw Error();
    const url=new URL(process.env.DATABASE_URL);
    url.searchParams.set('connect_timeout','5');
    const db=new PrismaClient({datasourceUrl:url.toString(),log:[]});
    try {
      await db.$queryRaw`SELECT 1`;
      const incomplete=await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
      if(incomplete.length)throw Error();
      await db.rewardLot.count();
      await db.rewardReservation.count();
      return 'Connected; reward tables present; no unfinished migration';
    } finally {await db.$disconnect();}
  });
  await check('Redis',async()=>{
    if(!process.env.REDIS_URL)throw Error();
    const client=new Redis(process.env.REDIS_URL,{lazyConnect:true,connectTimeout:5000,maxRetriesPerRequest:0,retryStrategy:()=>null});
    client.on('error',()=>{});
    try {await client.connect();if(await client.ping()!=='PONG')throw Error();return 'Connected';}
    finally {client.disconnect();}
  });
  for(const item of checks) console.log(`${item.ok?'PASS':'FAIL'} ${item.check}: ${item.detail}`);
  console.log('This check does not certify indexing, collection, payments, or launch readiness.');
  if(checks.some(item=>!item.ok))process.exitCode=1;
}
main().catch(()=>{console.error('Readiness check failed; sensitive details withheld.');process.exitCode=1;});
