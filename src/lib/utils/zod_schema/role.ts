import { RoleType, RoleName } from '@/constants/role';
import { z } from 'zod';

const roleNullSchema = z.union([z.object({}), z.string()]);

const roleListQuerySchema = z.object({
  type: z.nativeEnum(RoleType),
});

const roleOutputSchema = Object.values(RoleName) as [RoleName, ...RoleName[]];

export const roleListSchema = {
  input: {
    querySchema: roleListQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};
