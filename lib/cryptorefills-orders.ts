import {required} from './config';
import type {Visitor} from './cryptorefills';
import type {CardProduct} from './gift-cards';
import {validateCardAmount} from './gift-cards';
import {validateProblems} from './card-payment-policy';

export function cardOrderBody(product:CardProduct,value:string,email:string){
  validateCardAmount(product,value);
  return {user:{email,has_accepted_newsletter:false},email,lang:'en',
    payment:{type:'via',payment_via:'USER_WALLET',coin:'SOL',network:'Solana'},
    deliveries:[{brand_name:product.brand,country_code:product.country,denomination:product.denomination,
      beneficiary_account:email,...(product.denomination==='range'?{product_value:value}:{})}]};
}
export function cryptorefillsOrders(visitor:Visitor,transport:typeof fetch=fetch){
  async function request(path:string,body?:unknown){
    const response=await transport(`https://api.cryptorefills.com${path}`,{method:body===undefined?'GET':'POST',
      headers:{'X-Cr-Application':required('CRYPTOREFILLS_PARTNER_ID'),'X-Cr-Version':'0.2.0',Accept:'application/json',
        'Content-Type':'application/json','User-Agent':visitor.userAgent,...(visitor.ip?{'X-Forwarded-For':visitor.ip}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Cryptorefills request failed (${response.status})`);
    return response.json() as Promise<unknown>;
  }
  return {
    async validate(body:ReturnType<typeof cardOrderBody>){return validateProblems(await request('/v5/orders/validations',body));},
    create:(body:ReturnType<typeof cardOrderBody>)=>request('/v5/orders',body),
    status:(id:string)=>request(`/v5/orders/${encodeURIComponent(id)}`)
  };
}
