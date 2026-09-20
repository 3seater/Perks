import {json,route} from '@/lib/http';
import {solPrice} from '@/lib/jupiter';

export const GET=route(async()=>json({usdPerSol:Number(await solPrice())/1_000_000}));
