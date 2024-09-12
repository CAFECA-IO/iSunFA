import { z } from 'zod';

export const iLineItemValidator = z.object({
  lineItemIndex: z.string(),
  account: z.string(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.number(),
  accountId: z.number(),
});
