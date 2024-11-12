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

const roomGetQuerySchema = z.object({
  roomId: z.string(),
});

export const roomGetSchema = {
  input: {
    querySchema: roomGetQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: roomSchema,
  frontend: nullSchema,
};

const roomDeleteQuerySchema = z.object({
  roomId: z.string(),
});

export const roomDeleteSchema = {
  input: {
    querySchema: roomDeleteQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: roomSchema.nullable(),
  frontend: nullSchema,
};
