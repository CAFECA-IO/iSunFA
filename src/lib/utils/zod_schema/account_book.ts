import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
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

  // Info: (20250515 - Shirley) RC2 fields
  representativeName: z.string().optional(),
  taxSerialNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  enteredAddress: z.string().optional(),
  newAddress: z.string().optional(),
  filingFrequency: z.nativeEnum(FILING_FREQUENCY).optional(),
  filingMethod: z.nativeEnum(FILING_METHOD).optional(),
  declarantFilingMethod: z.nativeEnum(DECLARANT_FILING_METHOD).optional(),
  declarantName: z.string().optional(),
  declarantPersonalId: z.string().optional(),
  declarantPhoneNumber: z.string().optional(),
  agentFilingRole: z.nativeEnum(AGENT_FILING_ROLE).optional(),
  licenseId: z.string().optional(),
});

export const accountBookWithTeamSchema = accountBookSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
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
});

const accountBookListResponseSchema = paginatedDataSchema(accountBookWithTeamSchema);

export const accountBookListSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookNullSchema,
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

const getAccountBookResponseSchema = z.union([accountBookInfoSchema, z.null()]);

export const getAccountBookInfoSchema = {
  input: {
    querySchema: getAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: getAccountBookResponseSchema,
  frontend: accountBookNullSchema,
};

const accountBookInfoWithTeamSchema = accountBookWithTeamSchema.extend({
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

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: List Account Book Info (User - Detailed)
// ===================================================================================

// Info: (20250421 - Shirley) 定義獲取用戶所有帳本詳細信息的 schema
export const listAccountBookInfoSchema = {
  input: {
    querySchema: accountBookListQuerySchema, // Reuse list query schema
    bodySchema: accountBookNullSchema,
  },
  outputSchema: paginatedDataSchema(accountBookInfoWithTeamSchema),
  frontend: accountBookNullSchema,
};

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
  representativeName: z.string(),
  taxSerialNumber: z.string(),
  contactPerson: z.string(),
  phoneNumber: z.string(),
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
  outputSchema: accountBookSchema.nullable(),
  frontend: nullSchema,
};

// ===================================================================================
// Info: (20250422 - Shirley) API Schema: Update Account Book (Generic Action)
// ===================================================================================

const updateAccountBookBodySchema = z.object({
  action: z.nativeEnum(ACCOUNT_BOOK_UPDATE_ACTION),
  tag: z.nativeEnum(WORK_TAG).optional(),
});

const updateAccountBookResponseSchema = z.object({
  teamId: z.number().optional().default(0),
  company: accountBookSchema,
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
export type IGetAccountBookResponse = z.infer<typeof accountBookInfoSchema>;
export type IAccountBookInfoWithTeam = z.infer<typeof accountBookInfoWithTeamSchema>;
export type ICountry = z.infer<typeof countrySchema>;

export type IUpdateAccountBookInfoBody = z.infer<typeof updateAccountBookInfoBodySchema>;
