import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { roleSchema } from '@/lib/utils/zod_schema/role';
import { userSchema } from './user';

// Info: (20241029 - Jacky) UserRole null schema
const userRoleNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) UserRole list schema
const userRoleListQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) UserRole post schema
const userRolePostBodySchema = z.object({
  userId: z.number().int(),
  roleId: z.number().int(),
});

// Info: (20241015 - Jacky) UserRole select schema
const userRoleSelectQuerySchema = z.object({
  userId: zodStringToNumber,
  roleId: zodStringToNumber,
});

const userRoleOutputSchema = z
  .object({
    id: z.number().int(),
    role: roleSchema,
    user: userSchema,
    // lastLoginAt: z.number().int(), // ToDo: (20241030 - Jacky) SHOULD USE after db schema updated
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .transform((data) => ({
    ...data,
    role: data.role,
    user: data.user,
    lastLoginAt: data.role.lastLoginAt,
  }));

export const userRoleListSchema = {
  input: {
    querySchema: userRoleListQuerySchema,
    bodySchema: userRoleNullSchema,
  },
  outputSchema: userRoleOutputSchema,
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
