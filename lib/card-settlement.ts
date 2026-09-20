import {ledgerTransaction} from './trade-ledger';
import {integer} from './accounting';

// Settle the actual payment, returning any unused price/fee allowance. The card
// state and ledger commit together so replay cannot charge or release twice.
export async function settleCardPayment(id:string,actual:bigint,evidence:string,status:'PAID'|'FAILED'){
  if(actual<0n||!evidence)throw new Error('Invalid settlement');
  return ledgerTransaction(async tx=>{
    const order=await tx.cardCheckout.findUniqueOrThrow({where:{id}});
    if(evidence.startsWith('unpaid:')&&order.signedTransaction)throw new Error('A persisted payment must be reconciled, never released as unpaid');
    const reservation=await tx.rewardReservation.findUniqueOrThrow({where:{id},include:{allocations:true}});
    if(['SPENT','RELEASED'].includes(reservation.status)){
      if(reservation.resolutionEvidence!==evidence||integer(order.actualDebitLamports??0)!==actual)throw new Error('Conflicting settlement');
      return;
    }
    if(actual>integer(reservation.amountLamports))throw new Error('Payment exceeded authorization');
    let remaining=actual;
    for(const allocation of reservation.allocations){
      const reserved=integer(allocation.lamports),spent=remaining<reserved?remaining:reserved;
      await tx.rewardLot.update({where:{id:allocation.lotId},data:{reservedLamports:{decrement:reserved.toString()},spentLamports:{increment:spent.toString()}}});
      remaining-=spent;
    }
    if(remaining!==0n)throw new Error('Settlement allocation mismatch');
    await tx.rewardReservation.update({where:{id},data:{status:actual>0n?'SPENT':'RELEASED',resolutionEvidence:evidence,settlementReference:actual>0n?evidence:null}});
    const reason=evidence.split(':')[1];
    const explanation=reason==='invalid-payment-details'?'The card provider returned payment details we could not verify.':reason==='interrupted-order-creation'?'We could not finish setting up the card payment.':reason==='price-changed'||reason==='invoice-price-changed'?'The card price changed before payment.':reason==='queue-expired'?'The purchase request expired before payment.':'The purchase could not be completed.';
    await tx.cardCheckout.update({where:{id},data:{status,actualDebitLamports:actual.toString(),publicError:status==='FAILED'?`${explanation} ${actual===0n?'No SOL was charged. Your rewards are available to use again.':'Unspent rewards have been returned.'}`:null}});
  });
}
