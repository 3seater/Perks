import { isIP } from 'node:net';
import { z } from 'zod';
import { json, route } from '@/lib/http';
import { HttpError } from '@/lib/config';
import { countryCode, decimalAmount } from '@/lib/gift-cards';
import { cryptorefills } from '@/lib/cryptorefills';
import { rateLimit } from '@/lib/redis';

export const GET=route(async request=>{
  if(process.env.CARD_CATALOG_ENABLED!=='true')throw new HttpError(503,'The card catalog is being connected. Please check back shortly.');
  const params=new URL(request.url).searchParams;
  const country=countryCode.parse(params.get('country')??'US');
  // Production ingress must overwrite this configured header; never trust arbitrary forwarded chains.
  const header=process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip=header?request.headers.get(header):null;
  if(process.env.NODE_ENV==='production'&&(!ip||!isIP(ip)))throw new HttpError(503,'Card catalog connection is not configured.');
  if(ip&&!isIP(ip))throw new HttpError(400,'Invalid client address.');
  if(process.env.NODE_ENV==='production')await rateLimit(`cards:${ip}`,30);
  const provider=cryptorefills({ip:ip??undefined,userAgent:(request.headers.get('user-agent')??'Perks catalog').slice(0,500)});
  const action=z.enum(['brands','products','price']).parse(params.get('action')??'brands');
  if(action==='brands')return json({brands:await provider.brands(country)});
  const family=z.string().min(1).max(150).parse(params.get('family'));
  if(action==='products')return json({products:await provider.products(country,family)});
  const id=z.string().min(1).max(100).parse(params.get('product'));
  const amount=decimalAmount.parse(params.get('amount'));
  return json({quote:await provider.price(country,family,id,amount)});
});
