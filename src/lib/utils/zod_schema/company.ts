import { z } from 'zod';
// import { IZodSchema } from '@/interfaces/zod_schema';
import { CompanyTag, CompanyUpdateAction } from '@/constants/company';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { rolePrimsaSchema } from '@/lib/utils/zod_schema/role';
import { filePrismaSchema } from '@/lib/utils/zod_schema/file';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { ZodAPISchema } from '@/interfaces/zod_validator';

// Info: (20241028 - Jacky) Company null schema
const companyNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241016 - Jacky) Company list schema
const companyListQuerySchema = z.object({
  userId: zodStringToNumber,
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
  tag: z.nativeEnum(CompanyTag),
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
  tag: z.nativeEnum(CompanyTag).optional(),
});

// Info: (20241016 - Jacky) Company delete schema
const companyDeleteQuerySchema = z.object({
  companyId: zodStringToNumber,
});

// Info: (20241015 - Jacky) Company select schema
const companySelectQuerySchema = z.object({
  companyId: zodStringToNumber,
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

const companyRolePrismaSchema = z.object({
  company: companyPrismaSchema,
  tag: z.nativeEnum(CompanyTag),
  order: z.number().int(),
  role: rolePrimsaSchema,
});

const companyRoleOutputSchema = companyRolePrismaSchema.transform((data) => {
  return {
    ...data,
    company: {
      ...data.company,
      imageId: data.company.imageFile.url,
    },
  };
});
// Info: (20241028 - Jacky) Paginated data schema
const paginatedCompanyAndrolePrimsaSchema = paginatedDataSchema(companyRoleOutputSchema);

export const companyListSchema = {
  input: {
    querySchema: companyListQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: paginatedCompanyAndrolePrimsaSchema,
  frontend: companyNullSchema,
};

export const companyPostSchema = {
  input: {
    querySchema: companyPostQuerySchema,
    bodySchema: companyPostBodySchema,
  },
  outputSchema: companyRoleOutputSchema,
  frontend: companyNullSchema,
};

export const companyGetByIdSchema = {
  input: {
    querySchema: companyGetByIdQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companyRoleOutputSchema.nullable(),
  frontend: companyNullSchema,
};

export const companyPutSchema = {
  input: {
    querySchema: companyPutQuerySchema,
    bodySchema: companyPutBodySchema,
  },
  outputSchema: companyRoleOutputSchema,
  frontend: companyNullSchema,
};

export const companyDeleteSchema = {
  input: {
    querySchema: companyDeleteQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companyOutputSchema.nullable(),
  frontend: companyNullSchema,
};

export const companySelectSchema: ZodAPISchema = {
  input: {
    querySchema: companySelectQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companyOutputSchema.nullable(),
  frontend: companyNullSchema,
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
