import { z } from 'zod';
import { FileFolder } from '@/constants/file';
import { ProgressStatus } from '@/constants/account';

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
  progress: z.number().min(0).max(100).describe('上傳進度（0-100）'),
  status: z.nativeEnum(ProgressStatus).describe('是否暫停'),
});
