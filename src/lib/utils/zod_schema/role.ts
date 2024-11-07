import { RoleType } from '@/constants/role';
import { z } from 'zod';

const roleNullSchema = z.union([z.object({}), z.string()]);

const roleListQuerySchema = z.object({
  type: z.nativeEnum(RoleType),
});

export const rolePrimsaSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const roleOutputSchema = z.array(rolePrimsaSchema);

export const roleListSchema = {
  input: {
    querySchema: roleListQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};
