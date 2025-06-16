import { z } from 'zod';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';

export const ListBaifaVoucherQuerySchema = paginatedDataQuerySchema;

export const ListBaifaVoucherOutputSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.number(),
    // TODO: (20250613 - Tzuhan) Add more fields as needed
  })
);

export const ListBaifaVoucherSchema = {
  input: {
    querySchema: ListBaifaVoucherQuerySchema,
  },
  outputSchema: ListBaifaVoucherOutputSchema,
  frontend: ListBaifaVoucherOutputSchema,
};
