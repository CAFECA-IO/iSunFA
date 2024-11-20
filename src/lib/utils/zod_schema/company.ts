import { z } from 'zod';
import { COMPANY_TAG, CompanyUpdateAction } from '@/constants/company';
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
  tag: z.nativeEnum(COMPANY_TAG),
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
  action: z.nativeEnum(CompanyUpdateAction),
  tag: z.nativeEnum(COMPANY_TAG).optional(),
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
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const companyOutputSchema = companyPrismaSchema.transform((data) => {
  const { imageFile, ...rest } = data;
  const output = {
    ...rest,
    imageId: imageFile.url,
  };
  return output;
});

const companyRoleOutputSchema = z.object({
  company: companyOutputSchema,
  tag: z.nativeEnum(COMPANY_TAG),
  order: z.number().int(),
  role: rolePrimsaSchema,
});
// Info: (20241028 - Jacky) Paginated data schema
const paginatedCompanyAndroleOutputSchema = paginatedDataSchema(companyRoleOutputSchema);

const listedCompanyAndRoleOutputSchema = z.array(companyRoleOutputSchema);

export const companyListSchema = {
  input: {
    querySchema: companyListQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: z.union([paginatedCompanyAndroleOutputSchema, listedCompanyAndRoleOutputSchema]),
  frontend: nullSchema,
};

export const companyPostSchema = {
  input: {
    querySchema: companyPostQuerySchema,
    bodySchema: companyPostBodySchema,
  },
  outputSchema: companyRoleOutputSchema.nullable(),
  frontend: nullSchema,
};

export const companyGetByIdSchema = {
  input: {
    querySchema: companyGetByIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: companyRoleOutputSchema.nullable(),
  frontend: nullSchema,
};

export const companyPutSchema = {
  input: {
    querySchema: companyPutQuerySchema,
    bodySchema: companyPutBodySchema,
  },
  outputSchema: companyRoleOutputSchema,
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
