import {PublicKey} from '@solana/web3.js';
import {db} from '@/lib/db';
import {imageMime,ipfsImagePath} from '@/lib/token-image';
export const runtime='nodejs';
type Image={bytes:Uint8Array<ArrayBuffer>;mime:string};
const cache=new Map<string,Promise<Image>>();
async function loadImage(cid:string):Promise<Image>{
  for(const gateway of ['https://ipfs.io/ipfs/','https://gateway.pinata.cloud/ipfs/']){
    try{
      const response=await fetch(gateway+cid,{redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});
      if(!response.ok||!response.body||Number(response.headers.get('content-length'))>4_000_000)throw new Error('Image unavailable');
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
      try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>4_000_000)throw new Error('Image exceeds limit');chunks.push(value);}}finally{await reader.cancel();}
      const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      return {bytes,mime:imageMime(bytes)};
    }catch{/* Retry the same immutable content through the alternate gateway. */}
  }
  throw new Error('Token artwork is temporarily unavailable');
}
export async function GET(_request:Request,{params}:{params:Promise<{mint:string}>}){
  const {mint}=await params;
  try{new PublicKey(mint);}catch{return new Response(null,{status:400});}
  try{
    const token=await db.token.findUnique({where:{mintAddress:mint},select:{imageUrl:true}});
    if(!token)return new Response(null,{status:404});
    const cid=ipfsImagePath(token.imageUrl);
    let pending=cache.get(cid);
    if(!pending){if(cache.size>=16)cache.delete(cache.keys().next().value!);pending=loadImage(cid);cache.set(cid,pending);void pending.catch(()=>{if(cache.get(cid)===pending)cache.delete(cid);});}
    const image=await pending;
    return new Response(image.bytes,{headers:{'Content-Type':image.mime,'Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'}});
  }catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
}
