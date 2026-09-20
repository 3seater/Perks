import { required, HttpError } from './config';
export async function turnstile(token: string) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:required('TURNSTILE_SECRET_KEY'),response:token}),signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new HttpError(503,'Bot verification unavailable.');
  const result = await response.json();
  if (!result.success || result.hostname !== required('TURNSTILE_HOSTNAME') || result.action !== 'launch') throw new HttpError(403,'Bot verification failed. Please try again.');
}
