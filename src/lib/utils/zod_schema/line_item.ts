import { z } from 'zod';
import { IAccountValidator } from '@/lib/utils/zod_schema/account';

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

/**
 * Info: (20241106 - Murky)
 * @description this is for IReverseItem for " Select Reverse Item"
 */
export const IReverseItemValidator = z.object({
  voucherId: z.number(),
  voucherNo: z.string(),
  amount: z.number(),
  description: z.string(),
  account: IAccountValidator,
  debit: z.boolean(),
  lineItemBeReversedId: z.number(),
});
