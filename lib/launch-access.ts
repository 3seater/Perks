import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {walletSchema,verifySignature} from './auth';
import {HttpError,required} from './config';
import {redis} from './redis';

export const launchIntent=z.object({wallet:walletSchema,name:z.string().trim().min(1).max(32),symbol:z.string().regex(/^[A-Za-z0-9]{1,10}$/),description:z.string().trim().min(1).max(500),imageHash:z.string().regex(/^[a-f0-9]{64}$/),initialBuySol:z.string().regex(/^\d{1,3}(\.\d{1,9})?$/).default('0')});
export type LaunchIntent=z.infer<typeof launchIntent>;
export function intentHash(input:LaunchIntent){return createHash('sha256').update(JSON.stringify(launchIntent.parse(input))).digest('hex');}
export async function launchChallenge(input:LaunchIntent,verifiedOrigin=new URL(required('APP_ORIGIN')).origin){
  const id=randomUUID(),digest=intentHash(input);
  const message=`${verifiedOrigin}\nPrepare a Perks token launch\nWallet: ${input.wallet}\nName: ${input.name}\nTicker: ${input.symbol}\nInitial buy: ${input.initialBuySol} SOL\nIntent: ${digest}\nNonce: ${id}\nThis message authorizes preparation only. No funds are moved.`;
  await redis().set(`launch-proof:${id}`,JSON.stringify({wallet:input.wallet,digest,message}),'EX',300);
  return {challengeId:id,message};
}
export async function consumeLaunchProof(input:LaunchIntent,id:string,signature:string){
  const key=`launch-proof:${id}`,raw=await redis().get(key);
  if(!raw)throw new HttpError(401,'Launch authorization expired. Please try again.');
  const proof=JSON.parse(raw);
  if(proof.wallet!==input.wallet||proof.digest!==intentHash(input))throw new HttpError(401,'Launch details changed. Please authorize them again.');
  verifySignature(input.wallet,proof.message,signature);
  const used=await redis().eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",1,key,raw);
  if(used!==1)throw new HttpError(409,'Launch authorization was already used.');
}
