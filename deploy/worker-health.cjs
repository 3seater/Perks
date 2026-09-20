const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({log:[]});
async function main(){
  const mode=process.argv[2];
  if(mode==='indexer'){
    const row=await db.chainCursor.findUnique({where:{id:'solana'}});
    if(!row||Date.now()-row.updatedAt.getTime()>60000)throw Error();
  }else if(mode==='cards'){
    const row=await db.paymentWorkerState.findUnique({where:{id:'cards'}});
    if(!row||row.publicKey!==process.env.CARD_PAYMENT_PUBLIC_KEY||Date.now()-row.heartbeatAt.getTime()>90000)throw Error();
  }else throw Error();
}
const timer=setTimeout(()=>process.exit(1),8000);
main().catch(()=>{process.exitCode=1;}).finally(async()=>{await db.$disconnect();clearTimeout(timer);});
