import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { companyOutputSchema } from '@/lib/utils/zod_schema/company';

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
  companyId: z.number().int(),
  name: z.string(),
  deadline: z.number().int(),
  note: z.string().nullable(),
});

const todoGetQuerySchema = z.object({
  userId: zodStringToNumber,
  todoId: zodStringToNumber,
});

const todoPutQuerySchema = z.object({
  userId: zodStringToNumber,
  todoId: zodStringToNumber,
});

const todoPutBodySchema = z.object({
  companyId: z.number().int(),
  name: z.string(),
  deadline: z.number().int(),
  note: z.string().nullable(),
});

const todoDeleteQuerySchema = z.object({
  userId: zodStringToNumber,
  todoId: zodStringToNumber,
});

const todoOutputSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    deadline: z.number().int(),
    note: z.string().default(''),
    status: z.boolean(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
    userTodoCompanies: z.array(
      z.object({
        company: companyOutputSchema,
      })
    ),
  })
  .transform((data) => {
    const { userTodoCompanies, ...rest } = data;
    const { company } = userTodoCompanies[0];

    return {
      ...rest,
      company,
    };
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

export const todoGetSchema = {
  input: {
    querySchema: todoGetQuerySchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};

export const todoPutSchema = {
  input: {
    querySchema: todoPutQuerySchema,
    bodySchema: todoPutBodySchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};

export const todoDeleteSchema = {
  input: {
    querySchema: todoDeleteQuerySchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: todoOutputSchema,
  frontend: todoNullSchema,
};
