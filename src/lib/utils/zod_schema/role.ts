import { z } from 'zod';

export const rolePrimsaSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
