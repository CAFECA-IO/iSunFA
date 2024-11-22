import { z } from 'zod';

export const IAssociateLineItemEntitySchema = z.object({
  id: z.number(),
  associateVoucherId: z.number(),
  originalLineItemId: z.number(),
  resultLineItemId: z.number(),
  debit: z.boolean(),
  amount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  associateVoucher: z.any().optional(),
  originalLineItem: z.any().optional(),
  resultLineItem: z.any().optional(),
});
