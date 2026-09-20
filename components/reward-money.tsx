'use client';
import {useSyncExternalStore} from 'react';
import {api} from '@/lib/client';
import {formatRewardSol} from '@/lib/format-rewards';

let price:number|null=null,timer:ReturnType<typeof setInterval>|undefined;
const listeners=new Set<()=>void>();
let pending=false;
async function refresh(){
  if(pending)return;pending=true;
  try{const data=await api<{usdPerSol:number}>('/api/sol-price');price=Number.isFinite(data.usdPerSol)&&data.usdPerSol>0?data.usdPerSol:null;}
  catch{price=null;}finally{pending=false;listeners.forEach(fn=>fn());}
}
function subscribe(listener:()=>void){
  listeners.add(listener);
  if(!timer){void refresh();timer=setInterval(refresh,30000);}
  return()=>{listeners.delete(listener);if(!listeners.size){clearInterval(timer);timer=undefined;price=null;}};
}
export function useSolUsd(){return useSyncExternalStore(subscribe,()=>price,()=>null);}
export function money(amount:string|number,currency='USD'){
  return new Intl.NumberFormat('en-US',{style:'currency',currency,minimumFractionDigits:Number(amount)%1?2:0,maximumFractionDigits:2}).format(Number(amount));
}
export function SolEquivalent({amount,currency='USD'}:{amount:string|number;currency?:string}){
  const rate=useSolUsd();
  if(currency!=='USD'||!Number.isFinite(Number(amount))||Number(amount)<0)return null;
  return <small className="sol-equivalent">{rate?`≈ ${formatRewardSol(String(Math.floor(Number(amount)/rate*1e9)))} SOL`:'SOL estimate unavailable'}</small>;
}
export function RewardCost({lamports}:{lamports:string}){
  const rate=useSolUsd();
  return <span className="reward-money"><strong>{rate?`≈ ${money(Number(lamports)/1e9*rate)}`:'USD estimate unavailable'}</strong><small className="sol-equivalent" title={`${Number(lamports)/1e9} SOL`}>≈ {formatRewardSol(lamports)} SOL</small></span>;
}
