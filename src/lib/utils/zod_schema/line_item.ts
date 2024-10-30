import { z } from 'zod';

/**
 * Info: (20241025 - Murky)
 * @description schema for init line item entity or parsed prisma line item
 */
export const lineItemEntityValidator = z.object({
  id: z.number(),
  amount: z.number(),
  description: z.string(),
  debit: z.boolean(),
  accountId: z.number(),
  voucherId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});
