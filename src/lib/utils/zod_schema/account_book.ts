import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { WORK_TAG } from '@/interfaces/account_book';
import { TeamSchema } from '@/lib/utils/zod_schema/team';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

// Info: (20240324 - Shirley) 定義 Role 的 Schema
const roleSchema = z.object({
  id: z.number(),
  name: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Info: (20240324 - Shirley) 定義 AccountBook 的 Schema
const accountBookSchema = z.object({
  id: z.number(),
  imageId: z.string(),
  name: z.string(),
  taxId: z.string(),
  startDate: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  isPrivate: z.boolean().optional(), // ToDo: (20250224 - Liz) 等後端 API 調整後就改為必填
});

// Info: (20240324 - Shirley) 定義 AccountBookForUser 的 Schema
const accountBookForUserSchema = z.object({
  company: accountBookSchema,
  tag: z.nativeEnum(WORK_TAG),
  order: z.number(),
  role: roleSchema,
});

// Info: (20240324 - Shirley) 定義 AccountBookForUserWithTeam 的 Schema
const accountBookForUserWithTeamSchema = accountBookForUserSchema.extend({
  team: TeamSchema,
  isTransferring: z.boolean(),
});

// Info: (20240324 - Shirley) 定義 API 查詢參數的 Schema
const accountBookListQuerySchema = z.object({
  userId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_NUMBER),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

// Info: (20240324 - Shirley) 定義 API 回應的 Schema
const accountBookListResponseSchema = paginatedDataSchema(accountBookForUserWithTeamSchema);

// Info: (20240324 - Shirley) 定義空的 body Schema
const accountBookNullSchema = z.union([z.object({}), z.string()]);

// Info: (20240324 - Shirley) 導出 Schema
export const accountBookListSchema = {
  input: {
    querySchema: accountBookListQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: accountBookListResponseSchema,
  frontend: accountBookNullSchema,
};

// Info: (20240324 - Shirley) 導出類型
export type IAccountBookListQueryParams = z.infer<typeof accountBookListQuerySchema>;
export type IAccountBookListResponse = z.infer<typeof accountBookListResponseSchema>;

// Info: (20240324 - Shirley) 定義連接帳本的查詢參數 Schema
const connectAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

// Info: (20240324 - Shirley) 定義連接帳本的回應 Schema
const connectAccountBookResponseSchema = z.object({
  accountBookId: z.number(),
  status: z.string(),
});

// Info: (20240324 - Shirley) 定義連接帳本的回應 Schema (包含 null 情況)
const connectAccountBookResponseWithNullSchema = z.union([
  connectAccountBookResponseSchema,
  z.null(),
]);

// Info: (20240324 - Shirley) 導出連接帳本的 Schema
export const connectAccountBookSchema = {
  input: {
    querySchema: connectAccountBookQuerySchema,
    bodySchema: accountBookNullSchema,
  },
  outputSchema: connectAccountBookResponseWithNullSchema,
  frontend: accountBookNullSchema,
};

// Info: (20240324 - Shirley) 導出連接帳本的類型
export type IConnectAccountBookQueryParams = z.infer<typeof connectAccountBookQuerySchema>;
export type IConnectAccountBookResponse = z.infer<typeof connectAccountBookResponseSchema>;
