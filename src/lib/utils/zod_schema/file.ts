import { z } from 'zod';
import { FileFolder } from '@/constants/file';

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

/**
 * Info: (20241025 - Murky)
 * @description schema for init file entity or parsed prisma file
 */
export const fileEntityValidator = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  type: z.nativeEnum(FileFolder),
  url: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

/**
 * Info: (20241105 - Murky)
 * @description for IFileUIBeta
 */
export const IFileUIBetaValidator = z.object({
  id: z.number().nullable(),
  certificateId: z.number().optional(),
  name: z.string(),
  size: z.number(),
  url: z.string().url(),
  existed: z.boolean(),
});
