'use client';
import {useState} from 'react';
export function TokenImage({mint,source,alt='',fallback='✦'}:{mint:string;source?:string;alt?:string;fallback?:string}){
  const src=source?(source.startsWith('/')?source:`/api/token-image/${encodeURIComponent(mint)}`):'';
  const [failed,setFailed]=useState('');
  return src&&failed!==src?<img src={src} alt={alt} loading="lazy" onError={()=>setFailed(src)}/>:<span aria-label={alt||'Token artwork unavailable'}>{fallback}</span>;
}
