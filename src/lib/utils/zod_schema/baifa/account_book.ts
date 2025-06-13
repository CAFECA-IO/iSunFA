import { z } from 'zod';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';

export const ListBaifaAccountBookQuerySchema = paginatedDataQuerySchema;

export const ListBaifaAccountBookOutputSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.number(),
    // TODO: (20250613 - Tzuhan) Add more fields as needed
  })
);

export const ListBaifaAccountBookSchema = {
  input: {
    querySchema: ListBaifaAccountBookQuerySchema,
  },
  outputSchema: ListBaifaAccountBookOutputSchema,
  frontend: ListBaifaAccountBookOutputSchema,
};
