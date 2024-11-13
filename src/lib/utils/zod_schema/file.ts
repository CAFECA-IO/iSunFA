import { z } from 'zod';
import { FileFolder, UploadType } from '@/constants/file';
import { nullSchema } from '@/lib/utils/zod_schema/common';

const filePostBodySchema = z.object({
  type: z.nativeEnum(UploadType),
  targetId: z.string(),
});

export const filePrismaSchema = z.object({
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

export const fileSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  size: z.number(),
  existed: z.boolean(),
  url: z.string(),
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
 * @description for IFileUIBeta (這個是前端上傳file的時候用的), 後端驗證Response請用下面的IFileBetaValidator
 */
export const IFileUIBetaValidator = z.object({
  id: z.number().nullable(),
  certificateId: z.number().optional(),
  name: z.string(),
  size: z.number(),
  url: z.string().url(),
  existed: z.boolean(),
});

/**
 * Info: (20241108 - Murky)
 * @description for IFileBeta (這個是後端回傳file的時候用的), 前端驗證Request請用上面的IFileUIBetaValidator
 */
export const IFileBetaValidator = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number().describe('Bytes of file'),
  existed: z.boolean(),
  url: z.string(),
});

export const filePostSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: filePostBodySchema,
  },
  outputSchema: fileSchema,
  frontend: nullSchema,
};
