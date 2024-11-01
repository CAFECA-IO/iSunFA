import { FileFolder } from '@/constants/file';
import { z } from 'zod';

/**
 * Info: (20241025 - Murky)
 * @description schema for init file entity or parsed prisma file
 */
export const fileEntityValidator = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  type: z.nativeEnum(FileFolder),
  url: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});
