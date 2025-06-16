import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema } from '@/lib/utils/zod_schema/common';

export const listBaifaVoucherQuerySchema = paginatedDataQuerySchema;

export const listBaifaVoucherOutputSchema = paginatedDataSchema(
  z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.number(),
    // TODO: (20250613 - Tzuhan) Add more fields as needed
  })
);

export const listBaifaVoucherSchema = {
  input: {
    querySchema: listBaifaVoucherQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: listBaifaVoucherOutputSchema,
  frontend: listBaifaVoucherOutputSchema,
};
