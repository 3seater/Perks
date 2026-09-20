import { z } from 'zod';

export const countryCode = z.string().regex(/^[A-Z]{2}$/);
export const decimalAmount = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/);
export function units(value: string): bigint {
  const [whole,fraction='']=decimalAmount.parse(value).split('.');
  return BigInt(whole)*1_000_000n+BigInt(fraction.padEnd(6,'0'));
}
const decimal = z.union([z.string(),z.number().finite().nonnegative()]).transform(String).pipe(decimalAmount);
const brandSchema = z.object({brand_id:z.string(),brand:z.string(),family:z.string(),country_code:countryCode,
  kind:z.string(),category:z.string(),additional_categories:z.array(z.string()).default([]),
  is_out_of_stock:z.boolean(),logo_url:z.string().url().optional(),min:z.string().optional(),max:z.string().optional()});
export type CardBrand = {id:string;name:string;family:string;country:string;category:string;logo?:string;minimum?:string;maximum?:string};
const merchant = (b:z.infer<typeof brandSchema>) => b.kind==='giftcard' && b.category!=='e-money'
  && !b.additional_categories.includes('e-money') && !/visa|mastercard|prepaid|rewarble/i.test(b.brand);
export function parseBrands(raw:unknown,country:string): CardBrand[] {
  const data=z.object({country_code:countryCode,all_brands:z.array(brandSchema)}).parse(raw);
  if(data.country_code!==country)throw new Error('Catalog country mismatch');
  return data.all_brands.filter(b=>b.country_code===country&&merchant(b)&&!b.is_out_of_stock)
    .map(b=>({id:b.brand_id,name:b.brand,family:b.family,country:b.country_code,category:b.category,
      logo:b.logo_url?.startsWith('https://cdn.cryptorefills.com/')?b.logo_url:undefined,minimum:b.min,maximum:b.max}));
}
const product = z.object({product_id:z.string(),is_dynamic:z.boolean(),delivery_type:z.string(),coin:z.string(),
  denomination:z.string().optional(),range:z.object({min:decimal,max:decimal,currency:z.string(),step_size:decimal}).optional(),
  face_value:z.object({currency_code:z.string(),amount:z.object({type:z.string(),price:decimal.optional()})})});
export type CardProduct = {id:string;brand:string;country:string;currency:string;denomination:string;fixed?:string;min?:string;max?:string;step?:string;terms:string;logo?:string};
export function parseProducts(raw:unknown,country:string,family:string): CardProduct[] {
  const groups=z.array(brandSchema.extend({products:z.array(product),product_tc:z.string().default('')})).parse(raw);
  return groups.filter(b=>merchant(b)&&!b.is_out_of_stock&&b.country_code===country&&b.family===family).flatMap(b=>
    b.products.filter(p=>p.delivery_type==='by_email'&&p.coin==='USDC').map(p=>{
      const common={id:p.product_id,brand:b.brand,country,currency:p.face_value.currency_code,terms:b.product_tc,logo:b.logo_url?.startsWith('https://cdn.cryptorefills.com/')?b.logo_url:undefined};
      if(p.is_dynamic) {
        if(!p.range||p.range.currency!==common.currency||units(p.range.step_size)<=0n||units(p.range.min)>units(p.range.max))throw new Error('Invalid denomination range');
        return {...common,denomination:'range',min:p.range.min,max:p.range.max,step:p.range.step_size};
      }
      if(!p.denomination||p.face_value.amount.type!=='fixed'||!p.face_value.amount.price)throw new Error('Invalid fixed denomination');
      return {...common,denomination:p.denomination,fixed:p.face_value.amount.price};
    }));
}
export function validateCardAmount(p:CardProduct,amount:string) {
  const n=units(amount);
  if(n<=0n)throw new Error('Choose a positive card amount');
  if(p.fixed!==undefined) {if(n!==units(p.fixed))throw new Error('Unsupported card amount');}
  else if(!p.min||!p.max||!p.step||n<units(p.min)||n>units(p.max)||(n-units(p.min))%units(p.step)!==0n)throw new Error('Unsupported card amount');
}
export type CardPrice = {productId:string;amount:string;currency:string;providerAmount:string;providerCurrency:'USDC';observedAt:string;expiresAt:string;redeemable:false};
export function parsePrice(raw:unknown,p:CardProduct,amount:string):CardPrice {
  validateCardAmount(p,amount);
  const r=z.object({product_id:z.string(),coin:z.literal('USDC'),coin_amount:decimal}).parse(raw);
  if(r.product_id!==p.id||units(r.coin_amount)<=0n)throw new Error('Provider price mismatch');
  const now=Date.now();
  return {productId:p.id,amount,currency:p.currency,providerAmount:r.coin_amount,providerCurrency:'USDC',
    observedAt:new Date(now).toISOString(),expiresAt:new Date(now+30000).toISOString(),redeemable:false};
}
