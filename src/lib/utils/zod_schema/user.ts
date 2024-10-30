import { z } from 'zod';
import { fileSchema } from '@/lib/utils/zod_schema/file';

export const userSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    email: z.string(),
    imageFile: fileSchema,
    agreementList: z.array(z.string()),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
    deletedAt: z.number().int().nullable(),
  })
  .transform((data) => {
    return {
      ...data,
      imageId: data.imageFile.url,
    };
  });
