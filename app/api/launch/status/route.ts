import {route,json} from '@/lib/http';
import {demo} from '@/lib/config';
import {readyCursor} from '@/lib/rewards';
export const GET=route(async()=>{
  const rewardBps=/^\d{1,4}$/.test(process.env.REWARD_BPS||'')?Number(process.env.REWARD_BPS):null;
  let reason='';
  if(demo()||process.env.LAUNCHES_ENABLED!=='true')reason='Live launches are being prepared.';
  else if(rewardBps===null)reason='The reward percentage must be configured first.';
  else if(process.env.NEXT_PUBLIC_SOLANA_NETWORK!=='mainnet-beta')reason='Mainnet configuration is not ready.';
  else if(process.env.METADATA_PROVIDER!=='pump'&&!process.env.PINATA_JWT)reason='Token image storage is not configured.';
  else try{await readyCursor();}catch{reason='The live indexer is catching up. Try again shortly.';}
  return json({enabled:!reason,pilot:false,rewardBps,reason});
});
