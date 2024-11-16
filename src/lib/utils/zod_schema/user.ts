import { z } from 'zod';
import { filePrismaSchema } from '@/lib/utils/zod_schema/file';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

const userGetQuerySchema = z.object({
  userId: zodStringToNumber,
});

const userPutQuerySchema = z.object({
  userId: zodStringToNumber,
});

const userPutBodySchema = z.object({
  name: z.string(),
  email: z.string(),
});

const userDeleteQuerySchema = z.object({
  userId: zodStringToNumber,
});

export const userPrismaSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  imageFile: filePrismaSchema,
  agreementList: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().default(0),
});

export const userOutputSchema = userPrismaSchema.transform((data) => {
  return {
    ...data,
    imageId: data.imageFile.url,
  };
});

/**
 * Info: (20241025 - Murky)
 * @description schema for init user entity or parsed prisma user
 * @todo vouchers, certificates, imageFile need to be implement
 */
export const userEntityValidator = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  imageFileId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  imageFile: z.any().optional(),
  vouchers: z.array(z.any()).optional(),
  certificates: z.array(z.any()).optional(),
});

export const userListSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: nullSchema,
  },
  outputSchema: z.array(userOutputSchema),
  frontend: nullSchema,
};

export const userGetSchema = {
  input: {
    querySchema: userGetQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: userOutputSchema,
  frontend: nullSchema,
};

export const userPutSchema = {
  input: {
    querySchema: userPutQuerySchema,
    bodySchema: userPutBodySchema,
  },
  outputSchema: userOutputSchema,
  frontend: nullSchema,
};

export const userDeleteSchema = {
  input: {
    querySchema: userDeleteQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: userOutputSchema,
  frontend: nullSchema,
};
