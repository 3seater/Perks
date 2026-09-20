import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError, required } from './config';
import {allowedRequestOrigin} from './request-origin';
export function origin(request: Request) {
  const value=request.headers.get('origin');
  if (!allowedRequestOrigin(value,required('APP_ORIGIN'),request.headers.get('host'),process.env.NODE_ENV)) throw new HttpError(403, 'Invalid request origin.');
  return value!;
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {status, headers: {'Cache-Control': 'no-store'}});
}
export function route(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await fn(request); }
    catch (error) {
      if (error instanceof HttpError) return json({error: error.message}, error.status);
      if (error instanceof ZodError || error instanceof SyntaxError) return json({error: 'Invalid request.'}, 400);
      // Do not log provider responses, signed payloads, or voucher credentials.
      console.error('Request failed', error instanceof Error ? error.name : 'UnknownError');
      return json({error: 'Service temporarily unavailable. Please try again shortly.'}, 503);
    }
  };
}
