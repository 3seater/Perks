/** Shared per-process snapshot; concurrent visitors reuse one upstream request. */
export function snapshotCache<T>(load:()=>Promise<T>,ttlMs:number){
  let snapshot:T|undefined,expires=0,pending:Promise<T>|undefined;
  return async()=>{
    if(snapshot!==undefined&&Date.now()<expires)return snapshot;
    if(pending)return pending;
    pending=load().then(value=>{snapshot=value;expires=Date.now()+ttlMs;return value;}).finally(()=>{pending=undefined;});
    return pending;
  };
}
