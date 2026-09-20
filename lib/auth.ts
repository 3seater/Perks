import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { HttpError } from './config';
export const walletSchema = z.string().refine(value => { try { return PublicKey.isOnCurve(new PublicKey(value).toBytes()); } catch { return false; } }, 'Invalid wallet');
export const proofSchema = z.object({challengeId: z.string().uuid(), signature: z.string().max(128)});
export function verifySignature(wallet: string, message: string, signature: string) {
  let valid = false;
  try { valid = nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), new PublicKey(wallet).toBytes()); } catch { /* invalid proof */ }
  if (!valid) throw new HttpError(401, 'Wallet signature could not be verified.');
}
