import { z } from 'zod';

const RsaOtherPrimesInfoSchema = z.object({
  r: z.string().optional(), // Replace `r`, `d`, and `t` with actual fields for `RsaOtherPrimesInfo`
  d: z.string().optional(),
  t: z.string().optional(),
});

export const JsonWebKeySchema = z.object({
  alg: z.string().optional(), // Algorithm (e.g., "RS256")
  crv: z.string().optional(), // Curve (e.g., "P-256")
  d: z.string().optional(), // Private exponent
  dp: z.string().optional(), // First factor CRT exponent
  dq: z.string().optional(), // Second factor CRT exponent
  e: z.string().optional(), // Public exponent
  ext: z.boolean().optional(), // Indicates if the key is extractable
  k: z.string().optional(), // Symmetric key material
  key_ops: z.array(z.string()).optional(), // Permitted operations for the key
  kty: z.string().optional(), // Key type (e.g., "RSA", "EC")
  n: z.string().optional(), // Modulus
  oth: z.array(RsaOtherPrimesInfoSchema).optional(), // Other prime information for RSA
  p: z.string().optional(), // First prime factor
  q: z.string().optional(), // Second prime factor
  qi: z.string().optional(), // CRT coefficient
  use: z.string().optional(), // Key use (e.g., "sig", "enc")
  x: z.string().optional(), // X-coordinate for EC keys
  y: z.string().optional(), // Y-coordinate for EC keys
});
