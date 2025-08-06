import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

const imageOutputSchema = z.instanceof(Buffer);

export const imageGetByIdSchema = {
  input: {
    querySchema: z.object({ imageId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: imageOutputSchema.nullable(),
  frontend: nullSchema,
};

export const imageGetSchema = {
  input: {
    querySchema: z.object({ accountBookId: zodStringToNumber, imageId: zodStringToNumber }),
    bodySchema: nullSchema,
  },
  outputSchema: imageOutputSchema.nullable(),
  frontend: nullSchema,
};
