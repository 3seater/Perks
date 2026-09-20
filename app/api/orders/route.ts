import { z } from 'zod';
import { route, origin, json } from '@/lib/http';
import { live, HttpError } from '@/lib/config';
import { verifySignature } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { publicOrder } from '@/lib/orders';
export const POST = route(async request => {
  origin(request); live();
  const proof = z.object({nonce:z.string().uuid(),signature:z.string().max(128)}).parse(await request.json());
  const raw = await redis().getdel(`orders-auth:${proof.nonce}`);
  if (!raw) throw new HttpError(401,'Authentication expired.');
  const {wallet,message} = JSON.parse(raw);
  verifySignature(wallet,message,proof.signature);
  const orders = await db.redemptionOrder.findMany({where:{walletAddress:wallet},orderBy:{createdAt:'desc'},take:20});
  return json({orders:await Promise.all(orders.map(o => publicOrder(o.id)))});
});
