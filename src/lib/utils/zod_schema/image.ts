import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

const imageGetQuerySchema = z.object({
  imageId: zodStringToNumber,
});

const imageOutputSchema = z.instanceof(Buffer);

export const imageGetSchema = {
  input: {
    querySchema: imageGetQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: imageOutputSchema.nullable(),
  frontend: nullSchema,
};
