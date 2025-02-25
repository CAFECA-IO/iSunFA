import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20240324 - Shirley) 定義 Role 的 Schema
const roleSchema = z.object({
  id: z.number(),
  name: z.string(),
  permissions: z.array(z.string()),
});

// Info: (20240324 - Shirley) 定義 Team 的 Schema
const teamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  imageId: z.string(),
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
  isPrivate: z.boolean(),
});

// Info: (20240324 - Shirley) 定義 AccountBookForUserWithTeam 的 Schema
const accountBookForUserWithTeamSchema = z.object({
  company: accountBookSchema,
  team: teamSchema,
  tag: z.string(),
  order: z.number(),
  role: roleSchema,
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

// Info: (20240324 - Shirley) 導出型別
export type IRoleSchema = z.infer<typeof roleSchema>;
export type ITeamSchema = z.infer<typeof teamSchema>;
export type IAccountBookSchema = z.infer<typeof accountBookSchema>;
export type IAccountBookForUserWithTeamSchema = z.infer<typeof accountBookForUserWithTeamSchema>;
export type IAccountBookListResponse = z.infer<typeof accountBookListResponseSchema>;
