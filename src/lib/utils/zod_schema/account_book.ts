import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { WORK_TAG, ACCOUNT_BOOK_UPDATE_ACTION, ACCOUNT_BOOK_ROLE } from '@/interfaces/account_book';
import { listByTeamIdQuerySchema, TeamSchema } from '@/lib/utils/zod_schema/team';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

// Info: (2025) `roleSchema` 不再需要，因為 `role` 已經改為 `accountBookRole`

export const accountBookSchema = z.object({
  id: z.number(),
  teamId: z.number().default(0),
  userId: z.number().default(555),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG), // Info: (2025) 新增 `tag`，對應 `IAccountBook`
  startDate: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isPrivate: z.boolean().optional(),
});

export const accountBookWithTeamSchema = accountBookSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
});

export const accountBookListQuerySchema = paginatedDataQuerySchema.extend({
  userId: zodStringToNumber,
});

const accountBookListResponseSchema = paginatedDataSchema(accountBookWithTeamSchema);

const updateAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const accountBookCreateQuerySchema = z.object({
  userId: zodStringToNumber,
});

const accountBookCreateBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG),
  teamId: z.number().int(),
});

export const accountBookCreateSchema = {
  input: {
    querySchema: accountBookCreateQuerySchema,
    bodySchema: accountBookCreateBodySchema,
  },
  outputSchema: accountBookSchema.nullable(),
  frontend: nullSchema,
};

const updateAccountBookBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
});

const updateAccountBookResponseSchema = z.object({
  teamId: z.number().optional().default(0),
  company: accountBookSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number().int(),
  accountBookRole: z.nativeEnum(ACCOUNT_BOOK_ROLE), // Info: (2025) 改為 `accountBookRole`
});

const accountBookNullSchema = z.union([z.object({}), z.string()]);

export const accountBookListSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookNullSchema,
};

const connectAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const connectAccountBookResponseSchema = z.object({
  accountBookId: z.number(),
});

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
  outputSchema: accountBookSchema.nullable(),
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

export type IAccountBookListQueryParams = z.infer<typeof accountBookListQuerySchema>;
export type IAccountBookListResponse = z.infer<typeof accountBookListResponseSchema>;

// Info: (20250310 - Shirley) 以下類型定義已被棄用，但保留以向後兼容
// 新的 connectAccountBook API 回傳 IAccountBook 類型
export type IConnectAccountBookQueryParams = z.infer<typeof connectAccountBookQuerySchema>;
export type IConnectAccountBookResponse = z.infer<typeof connectAccountBookResponseSchema>;

export type IGetAccountBookQueryParams = z.infer<typeof getAccountBookQuerySchema>;
export type IGetAccountBookResponse = z.infer<typeof accountBookInfoSchema>;
export type ICountry = z.infer<typeof countrySchema>;

export const updateAccountBookSchema = {
  input: {
    querySchema: updateAccountBookQuerySchema,
    bodySchema: updateAccountBookBodySchema,
  },
  outputSchema: updateAccountBookResponseSchema.nullable(),
  frontend: nullSchema,
};
