import { z } from 'zod';

export const fileSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  type: z.string(),
  url: z.string(),
  isEncrypted: z.boolean(),
  encryptedSymmetricKey: z.string(),
  iv: z.instanceof(Uint8Array),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable(),
});
