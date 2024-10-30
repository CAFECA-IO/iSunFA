import { z } from 'zod';
// import { IZodSchema } from '@/interfaces/zod_schema';
import { CompanyTag, CompanyUpdateAction } from '@/constants/company';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from './pagination';

// Info: (20241028 - Jacky) Company null schema
const companyNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241016 - Jacky) Company list schema
const companyListQuerySchema = z.object({
  searchQuery: z.string().optional(),
  targetPage: z.number().int().optional(),
  pageSize: z.number().int().optional(),
});

// Info: (20241016 - Jacky) Company post schema
const companyPostQuerySchema = z.object({
  companyId: z.number().int(),
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
  companyId: z.number().int(),
});

const companySchema = z.object({
  id: z.number().int(),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(CompanyTag),
  startDate: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const companyRoleSchema = z.object({
  company: companySchema,
  role: z.object({
    id: z.number().int(),
    name: z.string(),
    permissions: z.array(z.string()),
    lastLoginAt: z.number().int(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  }),
});

// Info: (20241028 - Jacky) Paginated data schema
const paginatedCompanyAndRoleSchema = paginatedDataSchema(companyRoleSchema);

export const companyListSchema = {
  input: {
    querySchema: companyListQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: paginatedCompanyAndRoleSchema,
  frontend: companyNullSchema,
};

export const companyPostSchema = {
  input: {
    querySchema: companyPostQuerySchema,
    bodySchema: companyPostBodySchema,
  },
  outputSchema: companyRoleSchema,
  frontend: companyNullSchema,
};

export const companyGetByIdSchema = {
  input: {
    querySchema: companyGetByIdQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companyRoleSchema,
  frontend: companyNullSchema,
};

export const companyPutSchema = {
  input: {
    querySchema: companyPutQuerySchema,
    bodySchema: companyPutBodySchema,
  },
  outputSchema: companyRoleSchema,
  frontend: companyNullSchema,
};

export const companyDeleteSchema = {
  input: {
    querySchema: companyDeleteQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companySchema,
  frontend: companyNullSchema,
};

export const companySelectSchema = {
  input: {
    querySchema: companySelectQuerySchema,
    bodySchema: companyNullSchema,
  },
  outputSchema: companySchema,
  frontend: companyNullSchema,
};
