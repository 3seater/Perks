import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { required, HttpError } from './config';
let instance: Redis;
export const redis = () => instance ??= new Redis(process.env.PERKS_REDIS_URL || required('REDIS_URL'), { maxRetriesPerRequest: 2, enableOfflineQueue: true, connectTimeout:5000, commandTimeout:5000, lazyConnect: false });
export async function rateLimit(key: string, max = 10, seconds = 60) {
  const count = Number(await redis().eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n", 1, `rate:${key}`, seconds));
  if (count > max) throw new HttpError(429, 'Please wait before trying again.');
}
export async function walletLock<T>(wallet: string, fn: () => Promise<T>) {
  const key = `lock:claim:${wallet}`, owner = randomUUID();
  if (!await redis().set(key, owner, 'PX', 60000, 'NX')) throw new HttpError(409, 'A redemption is already processing.');
  try { return await fn(); }
  finally { await redis().eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, key, owner).catch(() => undefined); }
}
