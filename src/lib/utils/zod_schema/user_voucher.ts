import { z } from 'zod';

export const userVoucherEntityValidator = z.object({
  id: z.number(),
  userId: z.number(),
  voucherId: z.number(),
  isRead: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  user: z.any().optional(),
  voucher: z.any().optional(),
});
