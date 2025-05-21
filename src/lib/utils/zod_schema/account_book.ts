import { z } from 'zod';
import { nullSchema, zodStringToBoolean, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import {
  WORK_TAG,
  ACCOUNT_BOOK_UPDATE_ACTION,
  ACCOUNT_BOOK_ROLE,
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
} from '@/interfaces/account_book';
import { listByTeamIdQuerySchema, TeamSchema } from '@/lib/utils/zod_schema/team';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { LocaleKey } from '@/constants/normal_setting';

// ===================================================================================
// Info: (20250422 - Shirley) 基礎 Schema 定義 (Core Schemas)
// ===================================================================================

const countrySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  localeKey: z.string(),
  currencyCode: z.string(),
  phoneCode: z.string(),
  phoneExample: z.string(),
});

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

export const accountBookDetailSchema = accountBookSchema.extend({
  representativeName: z.string().default(''),
  taxSerialNumber: z.string().default(''),
  contactPerson: z.string().default(''),
  phoneNumber: z.string().default(''),
  city: z.string().default(''),
  district: z.string().default(''),
  enteredAddress: z.string().default(''),

  filingFrequency: z.nativeEnum(FILING_FREQUENCY).nullable().default(null),
  filingMethod: z.nativeEnum(FILING_METHOD).nullable().default(null),
  declarantFilingMethod: z.nativeEnum(DECLARANT_FILING_METHOD).nullable().default(null),
  declarantName: z.string().nullable().default(null),
  declarantPersonalId: z.string().nullable().default(null),
  declarantPhoneNumber: z.string().nullable().default(null),
  agentFilingRole: z.nativeEnum(AGENT_FILING_ROLE).nullable().default(null),
  licenseId: z.string().nullable().default(null),
});

export const accountBookWithTeamSchema = accountBookSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
});

export const accountBookDetailWithTeamSchema = accountBookDetailSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
});

// ===================================================================================
// Info: (20250422 - Shirley) 通用查詢參數 / 輔助 Schema (Common Query Params / Helpers)
// ===================================================================================

const accountBookIdQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const accountBookNullSchema = z.union([z.object({}), z.string()]);

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: List Account Books (User)
// ===================================================================================

export const accountBookListQuerySchema = paginatedDataQuerySchema.extend({
  userId: zodStringToNumber,
  simple: zodStringToBoolean.optional(),
});

const accountBookListResponseSchema = paginatedDataSchema(accountBookDetailWithTeamSchema);

export const accountBookListSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookNullSchema,
};

export const accountBookListSimpleSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: paginatedDataSchema(accountBookSchema),
};
// ===================================================================================
// Info: (20250422 - Shirley) API Schema: List Account Books (Team)
// ===================================================================================

export const listAccountBooksByTeamIdSchema = {
  input: {
    querySchema: listByTeamIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookListResponseSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Get Account Book Info
// ===================================================================================

const getAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

// Info: (20250519 - Shirley) 將 accountBookInfoSchema 修改為使用 accountBookDetailSchema
const getAccountBookResponseSchema = accountBookDetailSchema;

export const getAccountBookInfoSchema = {
  input: {
    querySchema: getAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: getAccountBookResponseSchema.nullable(),
  frontend: accountBookNullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: List Account Book Info (User - Detailed)
// ===================================================================================

// // Info: (20250421 - Shirley) 定義獲取用戶所有帳本詳細信息的 schema
// export const listAccountBookInfoSchema = {
//   input: {
//     querySchema: accountBookListQuerySchema, // Reuse list query schema
//     bodySchema: accountBookNullSchema,
//   },
//   outputSchema: z.union([
//     paginatedDataSchema(accountBookInfoWithTeamSchema),
//     paginatedDataSchema(accountBookSchema),
//   ]),
//   frontend: accountBookNullSchema,
// };

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Create Account Book (User)
// ===================================================================================

const accountBookCreateQuerySchema = z.object({
  userId: zodStringToNumber,
});

const accountBookCreateBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  tag: z.nativeEnum(WORK_TAG),
  teamId: z.number().int(),
  fileId: z.number().int().optional(),
  representativeName: z.string().optional(),
  taxSerialNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  enteredAddress: z.string().optional(),
  filingFrequency: z.nativeEnum(FILING_FREQUENCY).optional(),
  filingMethod: z.nativeEnum(FILING_METHOD).optional(),
  declarantFilingMethod: z.nativeEnum(DECLARANT_FILING_METHOD).optional(),
  declarantName: z.string().optional(),
  declarantPersonalId: z.string().optional(),
  declarantPhoneNumber: z.string().optional(),
  agentFilingRole: z.nativeEnum(AGENT_FILING_ROLE).optional(),
  licenseId: z.string().optional(),
});

export const accountBookCreateSchema = {
  input: {
    querySchema: accountBookCreateQuerySchema,
    bodySchema: accountBookCreateBodySchema,
  },
  outputSchema: accountBookDetailSchema.nullable(),
  frontend: nullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Update Account Book (Generic Action)
// ===================================================================================

const updateAccountBookBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
  name: z.string().optional(),
  taxId: z.string().optional(),
  taxSerialNumber: z.string().optional(),
  representativeName: z.string().optional(),
  country: z.nativeEnum(LocaleKey).optional(),
  phoneNumber: z.string().optional(),
  startDate: z.number().optional(),
  contactPerson: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  enteredAddress: z.string().optional(),
  filingFrequency: z.nativeEnum(FILING_FREQUENCY).nullable().default(null),
  filingMethod: z.nativeEnum(FILING_METHOD).nullable().default(null),
  declarantFilingMethod: z.nativeEnum(DECLARANT_FILING_METHOD).nullable().default(null),
  declarantName: z.string().nullable().default(null),
  declarantPersonalId: z.string().nullable().default(null),
  declarantPhoneNumber: z.string().nullable().default(null),
  agentFilingRole: z.nativeEnum(AGENT_FILING_ROLE).nullable().default(null),
  licenseId: z.string().nullable().default(null),
});

const updateAccountBookResponseSchema = z.object({
  teamId: z.number().optional().default(0),
  company: accountBookDetailSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number().int(),
  accountBookRole: z.nativeEnum(ACCOUNT_BOOK_ROLE), // Info: (20250422 - Shirley) 改為 `accountBookRole`
});

export const updateAccountBookSchema = {
  input: {
    querySchema: accountBookIdQuerySchema,
    bodySchema: updateAccountBookBodySchema,
  },
  outputSchema: updateAccountBookResponseSchema.nullable(),
  frontend: nullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Update Account Book Info (Detailed)
// ===================================================================================

// Info: (20250410 - Shirley) 更新帳本信息的 body schema
export const updateAccountBookInfoBodySchema = z.object({
  name: z.string().optional(),
  taxId: z.string().optional(),
  taxSerialNumber: z.string().optional(),
  representativeName: z.string().optional(),
  country: z.nativeEnum(LocaleKey).optional(),
  phoneNumber: z.string().optional(),
  address: z
    .object({
      city: z.string(),
      district: z.string(),
      enteredAddress: z.string(),
    })
    .optional(),
  startDate: z.number().optional(),

  // Info: (20250731 - Shirley) 新增 tag 欄位
  tag: z.nativeEnum(WORK_TAG).optional(),

  // Info: (20250517 - Shirley) 新增 RC2 欄位
  contactPerson: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  enteredAddress: z.string().optional(),
  filingFrequency: z.nativeEnum(FILING_FREQUENCY).optional(),
  filingMethod: z.nativeEnum(FILING_METHOD).optional(),
  declarantFilingMethod: z.nativeEnum(DECLARANT_FILING_METHOD).optional(),
  declarantName: z.string().optional(),
  declarantPersonalId: z.string().optional(),
  declarantPhoneNumber: z.string().optional(),
  agentFilingRole: z.nativeEnum(AGENT_FILING_ROLE).optional(),
  licenseId: z.string().optional(),
});

// Info: (20250410 - Shirley) 定義更新帳本信息的 schema
export const updateAccountBookInfoSchema = {
  input: {
    querySchema: getAccountBookQuerySchema,
    bodySchema: updateAccountBookInfoBodySchema,
  },
  outputSchema: getAccountBookResponseSchema,
  frontend: accountBookNullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Delete Account Book
// ===================================================================================

export const deleteAccountBookSchema = {
  input: {
    querySchema: accountBookIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: accountBookSchema.nullable(),
  frontend: nullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Connect Account Book
// ===================================================================================

const connectAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const connectAccountBookResponseSchema = z.object({
  accountBookId: z.number(),
});

export const connectAccountBookSchema = {
  input: {
    querySchema: connectAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookSchema.nullable(),
  frontend: accountBookNullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Disconnect Account Book
// ===================================================================================

export const disconnectAccountBookSchema = {
  input: {
    querySchema: accountBookIdQuerySchema, // Reuse ID query schema
    bodySchema: nullSchema,
  },
  outputSchema: z
    .object({
      success: z.boolean(),
    })
    .nullable(),
  frontend: nullSchema,
};

export type IAccountBookListQueryParams = z.infer<typeof accountBookListQuerySchema>;
export type IAccountBookListResponse = z.infer<typeof accountBookListResponseSchema>;

export type IConnectAccountBookQueryParams = z.infer<typeof connectAccountBookQuerySchema>;
export type IConnectAccountBookResponse = z.infer<typeof connectAccountBookResponseSchema>;

export type IGetAccountBookQueryParams = z.infer<typeof getAccountBookQuerySchema>;
// Info: (20250519 - Shirley) 更新 IGetAccountBookResponse 的類型，使用 accountBookDetailSchema
export type IGetAccountBookResponse = z.infer<typeof accountBookDetailSchema>;
// Info: (20250519 - Shirley) 不再需要 IAccountBookInfoWithTeam，改為使用 accountBookDetailWithTeamSchema
export type IAccountBookInfoWithTeam = z.infer<typeof accountBookDetailWithTeamSchema>;
export type ICountry = z.infer<typeof countrySchema>;

export type IUpdateAccountBookInfoBody = z.infer<typeof updateAccountBookInfoBodySchema>;
export type IUpdateAccountBookResponse = z.infer<typeof updateAccountBookResponseSchema>;
