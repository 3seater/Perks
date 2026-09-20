import { db } from './db';
import { encrypt, decrypt } from './crypto';
import { reloadly, type ProviderOrder, type Voucher } from './reloadly';
export async function fulfill(id: string, provider?: ProviderOrder) {
  const order = await db.redemptionOrder.findUniqueOrThrow({where:{id}});
  if (order.status === 'COMPLETED') return;
  const remote = provider ?? (order.reloadlyOrderId ? await reloadly.getOrder(order.reloadlyOrderId) : await reloadly.findOrder(order.customIdentifier));
  if (!remote) return;
  if (remote.customIdentifier && remote.customIdentifier !== order.customIdentifier) throw new Error('Provider order mismatch');
  await db.redemptionOrder.update({where:{id},data:{reloadlyOrderId:remote.transactionId}});
  if (!['SUCCESSFUL', 'SUCCESS', 'COMPLETED'].includes(remote.status)) {
    // Terminal failures also require reconciliation; never release money based on an ambiguous response.
    await db.redemptionOrder.update({where:{id},data:{status:'RECONCILING',errorCode:remote.status.slice(0,80)}});
    return;
  }
  const [card, instructions] = await Promise.all([reloadly.cards(remote.transactionId), reloadly.validateProduct(order.productId,order.amountCents/100)]);
  await db.redemptionOrder.update({where:{id},data:{status:'COMPLETED',voucherEncrypted:encrypt({...card,instructions}),errorCode:null}});
}
export async function dispatch(id: string, store = db.redemptionOrder, provider = reloadly, complete = fulfill) {
  // The DB compare-and-set is the durable at-most-once dispatch fence, independent of Redis expiry.
  const won = await store.updateMany({where:{id,status:'RESERVED'},data:{status:'SUBMITTING'}});
  if (!won.count) return;
  const order = await store.findUniqueOrThrow({where:{id}});
  try {
    const remote = await provider.order(order.productId,order.amountCents/100,order.customIdentifier);
    await complete(id,remote);
  } catch {
    await store.updateMany({where:{id,status:{not:'COMPLETED'}},data:{status:'RECONCILING',errorCode:'PROVIDER_RESULT_UNCERTAIN'}});
  }
}
export async function publicOrder(id: string) {
  const order = await db.redemptionOrder.findUniqueOrThrow({where:{id}});
  return {id:order.id, brand:order.brandName, amount:order.amountCents/100, status:order.status, voucher:order.status === 'COMPLETED' && order.voucherEncrypted ? decrypt<Voucher>(order.voucherEncrypted) : null};
}
