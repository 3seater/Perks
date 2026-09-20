import { z } from 'zod';
import { route, json } from '@/lib/http';
import { required, HttpError, live } from '@/lib/config';
import { secretEquals } from '@/lib/crypto';
import { redis } from '@/lib/redis';
export const POST = route(async request => {
  live();
  if (!secretEquals(request.headers.get('authorization')??'',required('HELIUS_WEBHOOK_SECRET'))) throw new HttpError(401,'Unauthorized webhook.');
  // Helius is a wakeup hint only: amounts and mint attribution are never trusted.
  // The worker independently reads finalized blocks, including SPL transfers.
  z.array(z.object({signature:z.string().max(100)}).passthrough()).max(1000).parse(await request.json());
  await redis().set('indexer:wakeup',Date.now().toString(),'EX',60);
  return json({accepted:true},202);
});
