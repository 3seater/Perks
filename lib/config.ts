export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
export const demo = () => process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
export function live(feature?: 'CLAIMS_ENABLED' | 'LAUNCHES_ENABLED') {
  // Retired Reloadly routes cannot be enabled against the trade reward ledger.
  if (feature === 'CLAIMS_ENABLED') throw new HttpError(503, 'Gift-card fulfillment is awaiting provider approval.');
  if (demo() || (feature && process.env[feature] !== 'true')) throw new HttpError(503, 'This feature is not enabled for live transactions.');
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
