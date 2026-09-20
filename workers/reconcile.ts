import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { db } from '../lib/db';
import { dispatch, fulfill } from '../lib/orders';
import { live } from '../lib/config';
async function main() {
  live();
  const orders=await db.redemptionOrder.findMany({where:{status:{in:['RESERVED','SUBMITTING','RECONCILING']},updatedAt:{lt:new Date(Date.now()-60000)}},take:100,orderBy:{createdAt:'asc'}});
  for(const order of orders) {
    try {if(order.status==='RESERVED')await dispatch(order.id);else await fulfill(order.id);}
    catch {console.error('Order requires reconciliation:',order.id);}
  }
}
main().catch(()=>{console.error('Reconciliation failed');process.exitCode=1;}).finally(()=>db.$disconnect());
