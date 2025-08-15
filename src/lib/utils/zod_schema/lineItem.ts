import { z } from 'zod';
import { IAccountValidator } from '@/lib/utils/zod_schema/account';

export const iLineItemValidator = z.object({
  lineItemIndex: z.string(),
  account: z.string(),
  description: z.string(),
  debit: z.boolean(),
  amount: z.string(),
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
  amount: z.string(),
  accountId: z.number().int(),
});

/**
 * Info: (20241105 - Murky)
 * @description ILineItemBeta is used in IVoucherBeta => ILineItemBeta => IAccount
 */
export const ILineItemBetaValidator = z.object({
  id: z.number(),
  amount: z.string(),
  description: z.string(),
  debit: z.boolean().nullable(),
  account: IAccountValidator.nullable(), // 使用 IAccountValidator 來驗證 account，並允許為 null
});
