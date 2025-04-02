import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { ICompanyValidator } from '@/lib/utils/zod_schema/company';
import {
  getTimestampNow,
  getTimestampOfLastSecondOfDate,
  timestampInMilliSeconds,
  timestampInSeconds,
} from '@/lib/utils/common';
import { accountBookSchema } from '@/lib/utils/zod_schema/account_book';
import loggerBack from '@/lib/utils/logger_back';

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
  companyId: z.number().int().optional(),
  name: z.string(),
  deadline: z
    .number()
    .int()
    .transform((data) => timestampInSeconds(data)),
  startTime: z
    .number()
    .int()
    .optional()
    .transform((data) => {
      if (data) {
        return timestampInSeconds(data);
      }
      return getTimestampNow();
    }),
  endTime: z
    .number()
    .int()
    .optional()
    .transform((data) => {
      if (data) {
        return timestampInSeconds(data);
      }
      return getTimestampOfLastSecondOfDate(getTimestampNow());
    }),
  note: z.string().nullable(),
});

const todoGetQuerySchema = z.object({
  userId: zodStringToNumber,
  todoId: zodStringToNumber,
});

const todoPutQuerySchema = z.object({
  todoId: zodStringToNumber,
});

const todoPutBodySchema = z.object({
  companyId: z.number().int().optional(),
  name: z.string(),
  deadline: z
    .number()
    .int()
    .transform((data) => timestampInSeconds(data)),
  startTime: z
    .number()
    .int()
    .optional()
    .transform((data) => {
      if (data) {
        return timestampInSeconds(data);
      }
      return getTimestampNow();
    }),
  endTime: z
    .number()
    .int()
    .optional()
    .transform((data) => {
      if (data) {
        return timestampInSeconds(data);
      }
      return getTimestampOfLastSecondOfDate(getTimestampNow());
    }),
  note: z.string().nullable(),
});

const todoDeleteQuerySchema = z.object({
  todoId: zodStringToNumber,
});

const todoOutputSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    deadline: z.number().int(),
    startTime: z.number().int(),
    endTime: z.number().int(),
    note: z.string().default(''),
    status: z.boolean(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
    userTodoCompanies: z.array(
      z.object({
        company: accountBookSchema.extend({
          imageFile: z.object({
            url: z.string().optional(),
          }),
        }),
      })
    ),
  })
  .transform((data) => {
    loggerBack.info(`todoOutputSchema: ${JSON.stringify(data)}`);
    const { userTodoCompanies, startTime, endTime, ...rest } = data;
    const { company } = userTodoCompanies[0];
    const startTimeInMilliseconds = timestampInMilliSeconds(startTime);
    const endTimeInMilliseconds = timestampInMilliSeconds(endTime);

    return {
      ...rest,
      startTime: startTimeInMilliseconds,
      endTime: endTimeInMilliseconds,
      company: {
        ...company,
        imageId: company.imageFile?.url ?? '',
      },
    };
  });

const paginatedTodoOutputSchema = z.array(todoOutputSchema);

const ITodoCompanyValidator = z.object({
  id: z.number().int(),
  name: z.string(),
  deadline: z.number().int(),
  note: z.string(),
  status: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  startTime: z.number().int(),
  endTime: z.number().int(),
  company: ICompanyValidator,
});

export const todoListSchema = {
  input: {
    querySchema: todoListQuerySchema,
    bodySchema: todoNullSchema,
  },
  outputSchema: paginatedTodoOutputSchema,
  frontend: z.array(ITodoCompanyValidator),
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
  frontend: ITodoCompanyValidator,
};
