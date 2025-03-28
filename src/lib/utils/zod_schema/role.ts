import { RoleType } from '@/interfaces/role';
import { z } from 'zod';

const roleNullSchema = z.union([z.object({}), z.string()]);

const roleListQuerySchema = z.object({
  type: z.nativeEnum(RoleType),
});

export const rolePrismaSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

const roleOutputSchema = z.array(rolePrismaSchema);

export const roleListSchema = {
  input: {
    querySchema: roleListQuerySchema,
    bodySchema: roleNullSchema,
  },
  outputSchema: roleOutputSchema,
  frontend: roleNullSchema,
};
