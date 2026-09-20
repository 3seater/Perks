import {db} from '@/lib/db';
import {redis} from '@/lib/redis';
import {json} from '@/lib/http';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Basic service health only; launch/payment readiness is checked separately.
// Do not expose configuration, database contents, or provider error messages.
export async function GET(){
  try{
    await Promise.all([db.$queryRaw`SELECT 1`,redis().ping()]);
    return json({ok:true});
  }catch{
    return json({ok:false},503);
  }
}
