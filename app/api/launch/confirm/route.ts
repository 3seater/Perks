import { z } from 'zod';
import { route, origin, json } from '@/lib/http';
import { live, HttpError } from '@/lib/config';
import { db } from '@/lib/db';
import { verifyLaunch } from '@/lib/pump';
export const POST = route(async request => {
  origin(request); live('LAUNCHES_ENABLED');
  const input = z.object({mint:z.string().min(32).max(44),signature:z.string().min(64).max(90)}).parse(await request.json());
  const token = await db.token.findUnique({where:{mintAddress:input.mint}});
  if (!token) throw new HttpError(404,'Launch not found.');
  const verified = await verifyLaunch(input.mint,token.creatorWallet,input.signature,token);
  // Indexer observes the creation in canonical order and activates it. Never skip past creation.
  await db.token.update({where:{mintAddress:input.mint},data:{launchSignature:input.signature,launchSlot:BigInt(verified.slot),totalSupply:verified.supply}});
  return json({mint:input.mint,status:token.status,signature:input.signature});
});
