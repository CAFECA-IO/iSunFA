// Info: (20250408 - Tzuhan) ✅ 統一 Utility: 從 note 中解析 startTime / endTime
import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { accountBookSchema } from '@/lib/utils/zod_schema/account_book';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

// Info: (20250408 - Tzuhan) Input Schemas
export const todoNullSchema = z.union([z.object({}), z.string()]);

export const todoIdSchema = z.object({
  todoId: zodStringToNumber,
});

export const userIdSchema = z.object({
  userId: zodStringToNumber,
});

export const todoPostPutBodySchema = z.object({
  accountBookId: z.number().optional(),
  name: z.string(),
  deadline: z.number(),
  startDate: z.number(),
  endDate: z.number(),
  note: z.string().default(''),
});

export const todoSchema = z.object({
  id: z.number(),
  name: z.string(),
  deadline: z.number(),
  note: z.string(),
  status: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  startTime: z.number(),
  endTime: z.number(),
});

// Info: (20250408 - Tzuhan) Backend Output Schema
export const todoOutputSchema = todoSchema.extend({
  company: accountBookSchema.nullable(),
});

export const paginatedTodoOutputSchema = paginatedDataSchema(todoOutputSchema);

// Info: (20250408 - Tzuhan) Export 組合
export const todoListSchema = {
  input: {
    querySchema: userIdSchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: z.array(todoOutputSchema),
  frontend: z.array(todoOutputSchema),
};

export const todoPostSchema = {
  input: {
    querySchema: userIdSchema,
    bodySchema: todoPostPutBodySchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};

export const todoGetSchema = {
  input: {
    querySchema: userIdSchema.merge(todoIdSchema),
    bodySchema: todoNullSchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};

export const todoPutSchema = {
  input: {
    querySchema: todoIdSchema,
    bodySchema: todoPostPutBodySchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};

export const todoDeleteSchema = {
  input: {
    querySchema: todoIdSchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoOutputSchema,
};
