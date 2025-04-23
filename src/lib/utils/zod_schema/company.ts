import { z } from 'zod';
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
// import { filePrismaSchema } from '@/lib/utils/zod_schema/file';
import { accountBookSchema } from './account_book';

// Info: (20241016 - Jacky) Company put schema
const accountBookPutQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});
const accountBookPutBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
});

// Info: (20241016 - Jacky) Company delete schema
const accountBookDeleteQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

/**
 * Deprecated: (20250327 - Tzuhan) replaced by accountBookSchema
export const companyOutputSchema = z.object({
  id: z.number().int(),
  teamId: z.number().default(0),
  userId: z.number().default(555),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG),
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  isPrivate: z.boolean(),
  imageFile: filePrismaSchema,
});
 */

export const accountBookPutSchema = {
  input: {
    querySchema: accountBookPutQuerySchema,
    bodySchema: accountBookPutBodySchema,
  },
  outputSchema: accountBookSchema,
  frontend: nullSchema,
};

export const accountBookDeleteSchema = {
  input: {
    querySchema: accountBookDeleteQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: accountBookSchema.nullable(),
  frontend: nullSchema,
};

const accountBookSearchQuerySchema = z.object({
  taxId: z.string().optional(),
  name: z.string().optional(),
});

export const accountBookSearchSchema = {
  input: {
    querySchema: accountBookSearchQuerySchema,
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
export const accountBookEntityValidator = z.object({
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

export const IAccountBookValidator = z.object({
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

const accountBookPutIconQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const accountBookPutIconBodySchema = z.object({
  fileId: z.number().int(),
});

export const accountBookPutIconSchema = {
  input: {
    querySchema: accountBookPutIconQuerySchema,
    bodySchema: accountBookPutIconBodySchema,
  },
  outputSchema: accountBookSchema.nullable(),
  frontend: accountBookSchema.nullable(),
};
