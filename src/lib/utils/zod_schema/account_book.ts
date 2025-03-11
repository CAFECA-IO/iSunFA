/*
 * TODO: (20250305 - Shirley)
 * 改用 zod_schema/company.ts 替代 zod_schema/account_book.ts
 */
import { z } from 'zod';
import {
  nullSchema,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { listByTeamIdQuerySchema, TeamSchema } from '@/lib/utils/zod_schema/team';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { rolePrimsaSchema } from '@/lib/utils/zod_schema/role';
import { companyOutputSchema } from '@/lib/utils/zod_schema/company';

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

const accountBookForUserWithoutTeamSchema = z.object({
  company: accountBookSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number(),
  role: roleSchema,
});

export const accountBookForUserSchema = z.object({
  teamId: z.number().optional().default(0),
  company: companyOutputSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number().int(),
  role: rolePrimsaSchema,
});

const accountBookForUserWithTeamSchema = accountBookForUserWithoutTeamSchema.extend({
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

export const accountBookListResponseSchema = paginatedDataSchema(accountBookForUserWithTeamSchema);

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

const accountBookInfoSchema = z.object({
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

const getAccountBookResponseSchema = z.union([accountBookInfoSchema, z.null()]);

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

export const getAccountBookInfoSchema = {
  input: {
    querySchema: getAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: getAccountBookResponseSchema,
  frontend: accountBookNullSchema,
};

export const listAccountBooksByTeamIdSchema = {
  input: {
    querySchema: listByTeamIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookListResponseSchema,
};

export type IConnectAccountBookQueryParams = z.infer<typeof connectAccountBookQuerySchema>;
export type IConnectAccountBookResponse = z.infer<typeof connectAccountBookResponseSchema>;

export type IGetAccountBookQueryParams = z.infer<typeof getAccountBookQuerySchema>;
export type IGetAccountBookResponse = z.infer<typeof accountBookInfoSchema>;
export type ICountry = z.infer<typeof countrySchema>;

// Info: (20250310 - Shirley) 定義更新帳本的 Schema
const updateAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const updateAccountBookBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
  isPrivate: z.boolean().optional(),
});

export const updateAccountBookSchema = {
  input: {
    querySchema: updateAccountBookQuerySchema,
    bodySchema: updateAccountBookBodySchema,
  },
  outputSchema: accountBookForUserSchema.nullable(),
  frontend: nullSchema,
};

// export const companyPutSchema = {
//   input: {
//     querySchema: companyPutQuerySchema,
//     bodySchema: companyPutBodySchema,
//   },
//   outputSchema: accountBookForUserSchema,
//   frontend: nullSchema,
// };
