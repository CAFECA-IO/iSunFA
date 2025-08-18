import { z } from 'zod';
import { IAccountValidator } from '@/lib/utils/zod_schema/account';

/**
 * Info: (20241025 - Murky)
 * @description schema for init line item entity or parsed prisma line item
 */
export const lineItemEntityValidator = z.object({
  id: z.number(),
  amount: z.union([z.string(), z.any().transform((val: any) => {
    // Handle Prisma Decimal objects
    if (val && typeof val === 'object' && typeof val.toString === 'function') {
      return val.toString();
    }
    return String(val);
  })]),
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
  amount: z.string(),
  description: z.string(),
  account: IAccountValidator,
  debit: z.boolean(),
  lineItemBeReversedId: z.number(),
});

export const lineItemAiSchema = z.object({
  id: z.number(),
  lineItemIndex: z.string(),
  account: z.string(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.string(),
});
