import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { rolePrimsaSchema } from '@/lib/utils/zod_schema/role';
import { userOutputSchema } from './user';

// Info: (20241029 - Jacky) UserRole null schema
const userRoleNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) UserRole list schema
const userRoleListQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) UserRole post schema
const userRolePostBodySchema = z.object({
  userId: z.number().int(),
  roleName: z.string(),
});

// Info: (20241015 - Jacky) UserRole select schema
const userRoleSelectQuerySchema = z.object({
  userId: zodStringToNumber,
  roleId: zodStringToNumber,
});

const userRoleOutputSchema = z.object({
  id: z.number().int(),
  role: rolePrimsaSchema,
  user: userOutputSchema,
  lastLoginAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const userRoleListOutputSchema = z.array(userRoleOutputSchema);

export const userRoleListSchema = {
  input: {
    querySchema: userRoleListQuerySchema,
    bodySchema: userRoleNullSchema,
  },
  outputSchema: userRoleListOutputSchema,
  frontend: userRoleNullSchema,
};

export const userRolePostSchema = {
  input: {
    querySchema: userRoleNullSchema,
    bodySchema: userRolePostBodySchema,
  },
  outputSchema: userRoleOutputSchema,
  frontend: userRoleNullSchema,
};

export const userRoleSelectSchema = {
  input: {
    querySchema: userRoleSelectQuerySchema,
    bodySchema: userRoleNullSchema,
  },
  outputSchema: userRoleOutputSchema,
  frontend: userRoleNullSchema,
};
