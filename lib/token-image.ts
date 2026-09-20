/** Only resolve immutable IPFS content, never an arbitrary server-side URL. */
export function ipfsImagePath(source:string){
  let path:string;
  if(source.startsWith('ipfs://'))path=source.slice(7).replace(/^ipfs\//,'');
  else{
    const url=new URL(source);
    if(url.protocol!=='https:'||!['ipfs.io','gateway.pinata.cloud','cloudflare-ipfs.com'].includes(url.hostname)||url.port||url.username||url.password||url.search||url.hash)throw new Error('Unsupported image source');
    if(!url.pathname.startsWith('/ipfs/'))throw new Error('Invalid IPFS path');
    path=url.pathname.slice(6);
  }
  if(!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,120})$/.test(path))throw new Error('Invalid image CID');
  return path;
}
export function imageMime(bytes:Uint8Array){
  if(bytes.length>=8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return 'image/png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';
  throw new Error('Unsupported image data');
}
