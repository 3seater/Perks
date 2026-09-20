import {route,origin,json} from '@/lib/http';
import {live} from '@/lib/config';
import {launchIntent,launchChallenge} from '@/lib/launch-access';
import {rateLimit} from '@/lib/redis';
export const POST=route(async request=>{
  const verifiedOrigin=origin(request);live('LAUNCHES_ENABLED');
  const input=launchIntent.parse(await request.json());
  await rateLimit(`launch-proof:${input.wallet}`,10,600);
  return json(await launchChallenge(input,verifiedOrigin));
});
