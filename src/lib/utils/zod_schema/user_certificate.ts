import { z } from 'zod';

export const userCertificateEntityValidator = z.object({
  id: z.number(),
  userId: z.number(),
  certificateId: z.number(),
  isRead: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  user: z.any().optional(),
  certificate: z.any().optional(),
});
