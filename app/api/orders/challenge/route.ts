import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { route, origin, json } from '@/lib/http';
import { live, required } from '@/lib/config';
import { walletSchema } from '@/lib/auth';
import { redis, rateLimit } from '@/lib/redis';
export const POST = route(async request => {
  origin(request); live();
  const {wallet} = z.object({wallet:walletSchema}).parse(await request.json());
  await rateLimit(`orders-auth:${wallet}`,10);
  const nonce = randomUUID();
  const message = `View private Perks gift cards\nWallet: ${wallet}\nOrigin: ${required('APP_ORIGIN')}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}\nExpires in: 120 seconds`;
  await redis().set(`orders-auth:${nonce}`,JSON.stringify({wallet,message}),'EX',120);
  return json({nonce,message});
});
