import { z } from 'zod';
import { required } from './config';
const base = () => process.env.RELOADLY_SANDBOX === 'true' ? 'https://giftcards-sandbox.reloadly.com' : 'https://giftcards.reloadly.com';
let cached: {value: string; until: number} | undefined;
async function accessToken() {
  if (cached && cached.until > Date.now()) return cached.value;
  const response = await fetch('https://auth.reloadly.com/oauth/token', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({client_id:required('RELOADLY_CLIENT_ID'), client_secret:required('RELOADLY_CLIENT_SECRET'), grant_type:'client_credentials', audience:base()}), signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Reloadly authentication failed');
  const data = z.object({access_token:z.string(), expires_in:z.number().positive()}).parse(await response.json());
  cached = {value:data.access_token, until:Date.now() + Math.max(0, data.expires_in - 60) * 1000};
  return cached.value;
}
async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base()}${path}`, {method, headers:{Authorization:`Bearer ${await accessToken()}`, Accept:'application/com.reloadly.giftcards-v1+json', 'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(20000), cache:'no-store'});
  if (!response.ok) throw new Error(`Reloadly HTTP ${response.status}`);
  return response.json();
}
const transaction = z.object({transactionId: z.union([z.number(),z.string()]).transform(String), status:z.string(), customIdentifier:z.string().nullish()}).passthrough();
export type ProviderOrder = z.infer<typeof transaction>;
export const voucherSchema = z.object({cardNumber:z.string(), pinCode:z.string().nullish()});
export type Voucher = z.infer<typeof voucherSchema> & {instructions: string};
export const reloadly = {
  async validateProduct(id: number, amount: number) {
    const p = z.object({productId:z.number(), recipientCurrencyCode:z.string(), denominationType:z.string(), fixedRecipientDenominations:z.array(z.number()).optional(), minRecipientDenomination:z.number().nullish(), maxRecipientDenomination:z.number().nullish(), country:z.object({isoName:z.string()}), redeemInstruction:z.object({concise:z.string().optional(), verbose:z.string().optional()}).optional()}).parse(await request(`/products/${id}`));
    if (p.country.isoName !== 'US' || p.recipientCurrencyCode !== 'USD') throw new Error('Product must be US/USD');
    const valid = p.denominationType === 'FIXED' ? p.fixedRecipientDenominations?.includes(amount) : p.minRecipientDenomination != null && p.maxRecipientDenomination != null && amount >= p.minRecipientDenomination && amount <= p.maxRecipientDenomination;
    if (!valid) throw new Error('Unsupported card denomination');
    return p.redeemInstruction?.verbose ?? p.redeemInstruction?.concise ?? 'Redeem on the merchant website using the card number and PIN. Keep these credentials private.';
  },
  async order(productId: number, amount: number, customIdentifier: string) {
    // Deliberately no automatic POST retries, including on 401, 429, or timeout.
    return transaction.parse(await request('/orders', 'POST', {productId, countryCode:'US', quantity:1, unitPrice:amount, customIdentifier, senderName:'Perks Launchpad'}));
  },
  async getOrder(id: string) { return transaction.parse(await request(`/orders/transactions/${encodeURIComponent(id)}`)); },
  async findOrder(identifier: string): Promise<ProviderOrder | null> {
    // A missing search result is NOT proof that an order failed and never permits a re-POST.
    const data = z.object({content:z.array(transaction)}).parse(await request(`/reports/transactions?customIdentifier=${encodeURIComponent(identifier)}&size=100`));
    return data.content.find(o => o.customIdentifier === identifier) ?? null;
  },
  async cards(id: string) {
    const cards = z.array(voucherSchema).parse(await request(`/orders/transactions/${encodeURIComponent(id)}/cards`));
    if (cards.length !== 1) throw new Error('Expected one voucher');
    return cards[0];
  }
};
