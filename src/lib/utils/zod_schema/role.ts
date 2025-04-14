import { z } from 'zod';
import { RoleType, RoleName } from '@/constants/role';

const roleNullSchema = z.union([z.object({}), z.string()]);

const roleListQuerySchema = z.object({
  type: z.nativeEnum(RoleType),
});

const roleOutputSchema = z.array(z.nativeEnum(RoleName));

export const roleListSchema = {
  input: {
    querySchema: roleListQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};
