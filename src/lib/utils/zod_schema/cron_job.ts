import { z } from 'zod';
import { nullSchema } from '@/lib/utils/zod_schema/common';

const cronJobGetQuerySchema = z.object({
  job: z.string(),
});

const cronJobOutputSchema = z.number().array();

export const cronJobGetSchema = {
  input: {
    querySchema: cronJobGetQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: cronJobOutputSchema,
  frontend: nullSchema,
};
