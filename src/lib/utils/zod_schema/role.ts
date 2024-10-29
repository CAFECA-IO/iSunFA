import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241029 - Jacky) Role null schema
const roleNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) Role list schema
const roleListQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) Role post schema
const rolePostBodySchema = z.object({
  userId: z.number().int(),
  roleId: z.number().int(),
});

// Info: (20241015 - Jacky) Role select schema
const roleSelectQuerySchema = z.object({
  userId: zodStringToNumber,
  roleId: zodStringToNumber,
});

const roleOutputSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  permissions: z.array(z.string()),
  lastLoginAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const roleListSchema = {
  input: {
    querySchema: roleListQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};

export const rolePostSchema = {
  input: {
    querySchema: roleNullSchema,
    bodySchema: rolePostBodySchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};

export const roleSelectSchema = {
  input: {
    querySchema: roleSelectQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};
