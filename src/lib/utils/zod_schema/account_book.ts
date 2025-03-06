/*
 * TODO: (20250305 - Shirley)
 * 改用 zod_schema/company.ts 替代 zod_schema/account_book.ts
 */
import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { WORK_TAG } from '@/interfaces/account_book';
import { TeamSchema } from '@/lib/utils/zod_schema/team';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

const roleSchema = z.object({
  id: z.number(),
  name: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const accountBookSchema = z.object({
  id: z.number(),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  startDate: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isPrivate: z.boolean().optional(),
});

const accountBookForUserSchema = z.object({
  company: accountBookSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number(),
  role: roleSchema,
});

const accountBookForUserWithTeamSchema = accountBookForUserSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
});

const accountBookListQuerySchema = z.object({
  userId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  searchQuery: z.string().optional(),
  sortOption: z.string().optional(),
});

const accountBookListResponseSchema = paginatedDataSchema(accountBookForUserWithTeamSchema);

const accountBookNullSchema = z.union([z.object({}), z.string()]);

export const accountBookListSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookNullSchema,
};

export type IAccountBookListQueryParams = z.infer<typeof accountBookListQuerySchema>;
export type IAccountBookListResponse = z.infer<typeof accountBookListResponseSchema>;

const connectAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const connectAccountBookResponseSchema = z.object({
  accountBookId: z.number(),
});

const connectAccountBookResponseWithNullSchema = z.union([
  connectAccountBookResponseSchema,
  z.null(),
]);

const countrySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  localeKey: z.string(),
  currencyCode: z.string(),
  phoneCode: z.string(),
  phoneExample: z.string(),
});

const accountBookDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  taxId: z.string(),
  taxSerialNumber: z.string(),
  representativeName: z.string(),
  country: countrySchema,
  phoneNumber: z.string(),
  address: z.string(),
  startDate: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const getAccountBookResponseSchema = z.union([accountBookDetailsSchema, z.null()]);

const getAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

export const connectAccountBookSchema = {
  input: {
    querySchema: connectAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: connectAccountBookResponseWithNullSchema,
  frontend: accountBookNullSchema,
};

export const getAccountBookSchema = {
  input: {
    querySchema: getAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: getAccountBookResponseSchema,
  frontend: accountBookNullSchema,
};

export type IConnectAccountBookQueryParams = z.infer<typeof connectAccountBookQuerySchema>;
export type IConnectAccountBookResponse = z.infer<typeof connectAccountBookResponseSchema>;

export type IGetAccountBookQueryParams = z.infer<typeof getAccountBookQuerySchema>;
export type IGetAccountBookResponse = z.infer<typeof accountBookDetailsSchema>;
export type ICountry = z.infer<typeof countrySchema>;
