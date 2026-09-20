const loopbackHosts=new Set(['localhost','127.0.0.1','[::1]']);

/** Permit local development aliases only for requests made on that same alias. */
export function allowedRequestOrigin(value:string|null,configured:string,host:string|null,environment:string|undefined){
  if(!value||value==='null')return false;
  try{
    const expected=new URL(configured),actual=new URL(value);
    if(actual.origin!==value)return false;
    if(value===expected.origin)return true;
    return environment==='development'
      &&loopbackHosts.has(expected.hostname)&&loopbackHosts.has(actual.hostname)
      &&actual.protocol===expected.protocol&&actual.port===expected.port
      &&actual.host===host?.toLowerCase();
  }catch{return false;}
}
