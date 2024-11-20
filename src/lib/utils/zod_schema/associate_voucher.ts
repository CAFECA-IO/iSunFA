import { z } from 'zod';

export const IAssociateVoucherEntitySchema = z.object({
  id: z.number(),
  eventId: z.number(),
  originalVoucherId: z.number(),
  resultVoucherId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  associateLineItems: z.array(z.any()),
  event: z.any().optional(),
  originalVoucher: z.any().optional(),
  resultVoucher: z.any().optional(),
});
