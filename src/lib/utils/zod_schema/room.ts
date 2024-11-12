import { z } from 'zod';
import { fileSchema } from '@/lib/utils/zod_schema/file';
import { nullSchema } from '@/lib/utils/zod_schema/common';

export const roomSchema = z.object({
  id: z.string(),
  password: z.string(),
  fileList: z.array(fileSchema),
});

export const roomPostSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: nullSchema,
  },
  outputSchema: roomSchema,
  frontend: nullSchema,
};

// Info: (20241112 - Jacky) Due to the security concern, we should pass the password in the body instead of the query.
const roomGetQuerySchema = z.object({
  roomId: z.string(),
});

const roomGetBodySchema = z.object({
  password: z.string(),
});

export const roomGetSchema = {
  input: {
    querySchema: roomGetQuerySchema,
    bodySchema: roomGetBodySchema,
  },
  outputSchema: roomSchema.nullable(),
  frontend: nullSchema,
};

const roomDeleteQuerySchema = z.object({
  roomId: z.string(),
});

const roomDeleteBodySchema = z.object({
  password: z.string(),
});

export const roomDeleteSchema = {
  input: {
    querySchema: roomDeleteQuerySchema,
    bodySchema: roomDeleteBodySchema,
  },
  outputSchema: roomSchema.nullable(),
  frontend: nullSchema,
};
