import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { WORK_TAG } from '@/interfaces/account_book';
import { TeamSchema } from '@/lib/utils/zod_schema/team';

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
});

// Info: (20240324 - Shirley) 定義 API 回應的 Schema
const accountBookListResponseSchema = z.array(accountBookForUserWithTeamSchema);

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
