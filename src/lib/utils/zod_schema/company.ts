import { z } from 'zod';
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import {
  nullSchema,
  zodStringToBoolean,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { rolePrimsaSchema } from '@/lib/utils/zod_schema/role';
import { filePrismaSchema } from '@/lib/utils/zod_schema/file';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';

// Info: (20241016 - Jacky) Company list schema
const companyListQuerySchema = z.object({
  userId: zodStringToNumber,
  simple: zodStringToBoolean.optional(),
  searchQuery: z.string().optional(),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

// Info: (20241016 - Jacky) Company post schema
const companyPostQuerySchema = z.object({
  userId: zodStringToNumber,
});
const companyPostBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG),
  teamId: z.number().int(),
  isPrivate: z.boolean(),
});

// Info: (20241016 - Jacky) Company get schema
const companyGetByIdQuerySchema = z.object({
  companyId: zodStringToNumber,
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

// Info: (20241015 - Jacky) Company select schema
const companySelectQuerySchema = z.object({
  userId: zodStringToNumber,
});

const companySelectBodySchema = z.object({
  companyId: z.number().int(),
});

const companyPrismaSchema = z.object({
  id: z.number().int(),
  imageFile: filePrismaSchema,
  name: z.string(),
  taxId: z.string(),
  isPrivate: z.boolean(),
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const companyOutputSchema = companyPrismaSchema.strip().transform((data) => {
  const { imageFile, ...rest } = data;
  const output = {
    ...rest,
    imageId: imageFile.url,
  };
  return output;
});

// TODO: (20250303 - Shirley) 討論create account book回傳的資料格式後，修改 schema
export const companyOutputSchemaWithTeam = companyPrismaSchema.strip().transform((data) => {
  const { imageFile, ...rest } = data;
  const output = {
    ...rest,
    imageId: imageFile.url,
  };
  return output;
});

export const accountBookForUserSchema = z.object({
  teamId: z.number(),
  company: companyOutputSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number().int(),
  role: rolePrimsaSchema,
});
// Info: (20241028 - Jacky) Paginated data schema
export const paginatedAccountBookForUserSchema = paginatedDataSchema(accountBookForUserSchema);

const listedAccountBookForUserSchema = z.array(accountBookForUserSchema);

export const companyListSchema = {
  input: {
    querySchema: companyListQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: z.union([paginatedAccountBookForUserSchema, listedAccountBookForUserSchema]),
  frontend: nullSchema,
};

export const companyPostSchema = {
  input: {
    querySchema: companyPostQuerySchema,
    bodySchema: companyPostBodySchema,
  },
  outputSchema: accountBookForUserSchema.nullable(),
  frontend: nullSchema,
};

export const companyGetByIdSchema = {
  input: {
    querySchema: companyGetByIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: accountBookForUserSchema.nullable(),
  frontend: nullSchema,
};

export const companyPutSchema = {
  input: {
    querySchema: companyPutQuerySchema,
    bodySchema: companyPutBodySchema,
  },
  outputSchema: accountBookForUserSchema,
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

export const companySelectSchema = {
  input: {
    querySchema: companySelectQuerySchema,
    bodySchema: companySelectBodySchema,
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
