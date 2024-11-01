import { z } from 'zod';

export const roleSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  permissions: z.array(z.string()),
  lastLoginAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});
