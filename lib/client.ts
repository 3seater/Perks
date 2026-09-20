export async function api<T>(path:string,body?:unknown):Promise<T> {
  const response = await fetch(path, body instanceof FormData ? {method:'POST',body} : body === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The service is restarting or temporarily unavailable. Please try again.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
