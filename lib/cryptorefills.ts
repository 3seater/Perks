import { HttpError, required } from './config';
import { countryCode, decimalAmount, parseBrands, parseProducts, parsePrice, validateCardAmount } from './gift-cards';

export type Visitor = {ip?:string;userAgent:string};
// Catalog/price only. There is deliberately no order-creation method here.
export function cryptorefills(visitor:Visitor,transport:typeof fetch=fetch) {
  async function get(path:string,query:Record<string,string>) {
    const url=new URL(path,'https://api.cryptorefills.com');
    url.search=new URLSearchParams(query).toString();
    const r=await transport(url,{method:'GET',headers:{'X-Cr-Application':required('CRYPTOREFILLS_PARTNER_ID'),
      'X-Cr-Version':'0.1.0',Accept:'application/json','User-Agent':visitor.userAgent,
      ...(visitor.ip?{'X-Forwarded-For':visitor.ip}:{})},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new HttpError(r.status===429?429:502,'Card catalog is temporarily unavailable. Please try again.');
    return r.json();
  }
  async function products(country:string,family:string) {
    countryCode.parse(country);
    return parseProducts(await get(`/v5/products/country/${country}`,{family_name:family,coin:'USDC',lang:'en'}),country,family);
  }
  return {
    async brands(country:string) {
      countryCode.parse(country);
      return parseBrands(await get('/v2/brands',{country_code:country}),country);
    },products,
    async price(country:string,family:string,productId:string,amount:string) {
      decimalAmount.parse(amount);
      // Resolve against the current provider catalog; client-supplied prices/brands are never trusted.
      const p=(await products(country,family)).find(p=>p.id===productId);
      if(!p)throw new HttpError(409,'This card is no longer available. Choose another card.');
      try {validateCardAmount(p,amount);}catch {throw new HttpError(400,'Choose one of the supported card amounts.');}
      return parsePrice(await get('/v4/products/price',{brand_name:p.brand,country_code:country,face_value:amount,coin:'USDC'}),p,amount);
    }
  };
}
