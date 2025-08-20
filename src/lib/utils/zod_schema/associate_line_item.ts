import { z } from 'zod';

export const IAssociateLineItemEntitySchema = z.object({
  id: z.number(),
  associateVoucherId: z.number(),
  originalLineItemId: z.number(),
  resultLineItemId: z.number(),
  debit: z.boolean(),
  amount: z.any().transform((val: unknown): string => {
    // Handle Prisma Decimal objects and ensure string output
    if (typeof val === 'string') {
      return val;
    }
    if (val && typeof val === 'object' && typeof val.toString === 'function') {
      return val.toString();
    }
    return String(val);
  }),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  associateVoucher: z.any().optional(),
  originalLineItem: z.any().optional(),
  resultLineItem: z.any().optional(),
});
