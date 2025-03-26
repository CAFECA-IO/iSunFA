import { z } from 'zod';
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { filePrismaSchema } from '@/lib/utils/zod_schema/file';

// Info: (20241016 - Jacky) Company post schema
const companyPostQuerySchema = z.object({
  userId: zodStringToNumber,
});
const companyPostBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG),
  teamId: z.number().int(),
});

// Info: (20241016 - Jacky) Company put schema
const companyPutQuerySchema = z.object({
  companyId: zodStringToNumber,
});
const companyPutBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
});

// Info: (20241016 - Jacky) Company delete schema
const companyDeleteQuerySchema = z.object({
  companyId: zodStringToNumber,
});

export const companyOutputSchema = z.object({
  id: z.number().int(),
  imageFile: filePrismaSchema,
  name: z.string(),
  taxId: z.string(),
  isPrivate: z.boolean(),
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  imageId: z.string(),
  teamId: z.number().optional().default(0),
  tag: z.nativeEnum(WORK_TAG),
});

export const companyPostSchema = {
  input: {
    querySchema: companyPostQuerySchema,
    bodySchema: companyPostBodySchema,
  },
  outputSchema: companyOutputSchema.nullable(),
  frontend: nullSchema,
};

export const companyPutSchema = {
  input: {
    querySchema: companyPutQuerySchema,
    bodySchema: companyPutBodySchema,
  },
  outputSchema: companyOutputSchema,
  frontend: nullSchema,
};

export const companyDeleteSchema = {
  input: {
    querySchema: companyDeleteQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: companyOutputSchema.nullable(),
  frontend: nullSchema,
};

const companySearchQuerySchema = z.object({
  taxId: z.string().optional(),
  name: z.string().optional(),
});

export const companySearchSchema = {
  input: {
    querySchema: companySearchQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: z
    .object({
      taxId: z.string(),
      name: z.string(),
    })
    .strip(),
  frontend: z.object({
    taxId: z.string(),
    name: z.string(),
  }),
};

/**
 * Info: (20241025 - Murky)
 * @description schema for init company entity or parsed prisma company
 */
export const companyEntityValidator = z.object({
  id: z.number(),
  name: z.string(),
  taxId: z.string(),
  // Deprecated: (20241023 - Murky) - tag will be removed after 20241030
  // tag: z.string(),
  startDate: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

export const ICompanyValidator = z.object({
  id: z.number().int(),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  teamId: z.number().int().nullable(),
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

/**
 * Info: (20241211 - Murky)
 * @note used in APIName.COMPANY_PUT_ICON
 */

const companyPutIconQuerySchema = z.object({
  companyId: zodStringToNumber,
});

const companyPutIconBodySchema = z.object({
  fileId: z.number().int(),
});

export const companyPutIconSchema = {
  input: {
    querySchema: companyPutIconQuerySchema,
    bodySchema: companyPutIconBodySchema,
  },
  outputSchema: companyOutputSchema.nullable(),
  frontend: companyOutputSchema.nullable(),
};
