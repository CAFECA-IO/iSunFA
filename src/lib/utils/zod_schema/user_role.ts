import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { RoleName, RoleType } from '@/constants/role';

// Info: (20241029 - Jacky) UserRole null schema
const userRoleNullSchema = z.union([z.object({}), z.string()]);

const userRoleQuerySchema = z.object({
  userId: zodStringToNumber,
});
// Info: (20241015 - Jacky) UserRole list schema
const userRoleListQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) UserRole post schema
const userRolePostBodySchema = z.object({
  roleName: z.nativeEnum(RoleName),
});

// Info: (20241015 - Jacky) UserRole select query schema
const userRoleSelectQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241111 - Jacky) UserRole select body schema
const userRoleSelectBodySchema = z.object({
  roleName: z.nativeEnum(RoleName),
});

export const userRoleOutputSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  roleName: z.nativeEnum(RoleName),
  type: z.nativeEnum(RoleType),
  lastLoginAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().optional(),
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
    querySchema: userRoleQuerySchema,
    bodySchema: userRolePostBodySchema,
  },
  outputSchema: userRoleOutputSchema.nullable(),
  frontend: userRoleNullSchema,
};

export const userRoleSelectSchema = {
  input: {
    querySchema: userRoleSelectQuerySchema,
    bodySchema: userRoleSelectBodySchema,
  },
  outputSchema: userRoleOutputSchema,
  frontend: userRoleNullSchema,
};
