import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241029 - Jacky) Todo null schema
const todoNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) Todo list schema
const todoListQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) Todo post schema
const todoPostQuerySchema = z.object({
  userId: zodStringToNumber,
});
const todoPostBodySchema = z.object({
  title: z.string(),
  content: z.string(),
  type: z.string(),
  time: z.number().int(),
  status: z.string(),
});

const todoOutputSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  content: z.string(),
  type: z.string(),
  time: z.number().int(),
  status: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const paginatedTodoOutputSchema = z.array(todoOutputSchema);

export const todoListSchema = {
  input: {
    querySchema: todoListQuerySchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: paginatedTodoOutputSchema,
  frontend: todoNullSchema,
};

export const todoPostSchema = {
  input: {
    querySchema: todoPostQuerySchema,
    bodySchema: todoPostBodySchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};
