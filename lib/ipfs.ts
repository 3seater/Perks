import { required, HttpError } from './config';
import {z} from 'zod';
async function pin(path: string, body: BodyInit, json = false) {
  const headers: Record<string,string> = {Authorization:`Bearer ${required('PINATA_JWT')}`};
  if (json) headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://api.pinata.cloud/pinning/${path}`,{method:'POST',headers,body,signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('IPFS upload failed');
  const data = await response.json();
  if (!/^[a-zA-Z0-9]+$/.test(data.IpfsHash)) throw new Error('Invalid IPFS response');
  return `${(process.env.PINATA_GATEWAY || 'https://ipfs.io/ipfs').replace(/\/$/,'')}/${data.IpfsHash}`;
}
export async function metadata(image: File, name: string, symbol: string, description: string) {
  if(process.env.METADATA_PROVIDER==='pump'){
    const body=new FormData();body.set('file',image);body.set('name',name);body.set('symbol',symbol);body.set('description',description);body.set('showName','true');
    const response=await fetch('https://pump.fun/api/ipfs',{method:'POST',body,signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new HttpError(503,'Pump.fun image upload is unavailable. Your wallet has not been charged. Please retry later.');
    const https=z.string().url().refine(value=>new URL(value).protocol==='https:');
    const data=z.object({metadataUri:https,metadata:z.object({image:https,name:z.string(),symbol:z.string(),description:z.string()})}).parse(await response.json());
    if(data.metadata.name!==name||data.metadata.symbol!==symbol||data.metadata.description!==description)throw new HttpError(503,'Uploaded token metadata could not be verified.');
    return {uri:data.metadataUri,imageUrl:data.metadata.image};
  }
  const form = new FormData(); form.set('file',image);
  const imageUrl = await pin('pinFileToIPFS',form);
  const uri = await pin('pinJSONToIPFS',JSON.stringify({pinataContent:{name,symbol,description,image:imageUrl,showName:true}}),true);
  return {imageUrl,uri};
}
