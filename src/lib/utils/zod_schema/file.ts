import { z } from 'zod';
import { FileFolder, UploadType } from '@/constants/file';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

const filePostQuerySchema = z.object({
  type: z.nativeEnum(UploadType),
  targetId: z.string(),
});

const fileGetQuerySchema = z.object({
  fileId: zodStringToNumber,
});

const fileDeleteQuerySchema = z.object({
  fileId: zodStringToNumber,
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

const fileOutputSchema = filePrismaSchema.transform((data) => {
  return {
    id: data.id,
    name: data.name,
    size: data.size,
    existed: true,
    url: data.url,
  };
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
  thumbnailId: z.number().nullable().optional(),
  thumbnail: z.any(),
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
  thumbnailId: z.number().nullable().optional(),
  thumbnail: z.any(),
});

export const filePostSchema = {
  input: {
    querySchema: filePostQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: fileOutputSchema.nullable(),
  frontend: nullSchema,
};

export const fileGetSchema = {
  input: {
    querySchema: fileGetQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: fileOutputSchema.nullable(),
  frontend: nullSchema,
};

export const fileDeleteSchema = {
  input: {
    querySchema: fileDeleteQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: fileOutputSchema.nullable(),
  frontend: nullSchema,
};

const filePutQuerySchema = z.object({
  fileId: zodStringToNumber,
});

const filePutBodySchema = z.object({
  name: z.string()?.optional(),
});

export const filePutSchema = {
  input: {
    querySchema: filePutQuerySchema,
    bodySchema: filePutBodySchema,
  },
  outputSchema: fileOutputSchema.nullable(),
  frontend: nullSchema,
};
