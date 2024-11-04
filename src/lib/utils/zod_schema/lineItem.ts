import { z } from 'zod';

export const iLineItemValidator = z.object({
  lineItemIndex: z.string(),
  account: z.string(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.number(),
  accountId: z.number(),
});

/**
 * ************************
 * Info: (20240927 - Murky)
 * V2 validators below
 * ************************
 */

export const iLineItemBodyValidatorV2 = z.object({
  id: z.number().optional(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.number(),
  accountId: z.number().int(),
});
