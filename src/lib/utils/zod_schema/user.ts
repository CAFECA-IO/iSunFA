import { z } from 'zod';

/**
 * Info: (20241025 - Murky)
 * @description schema for init user entity or parsed prisma user
 * @todo vouchers, certificates, imageFile need to be implement
 */
export const userEntityValidator = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  imageFileId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  imageFile: z.any().optional(),
  vouchers: z.array(z.any()).optional(),
  certificates: z.array(z.any()).optional(),
});
