import { z } from 'zod';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { userOutputSchema } from '@/lib/utils/zod_schema/user';
import { rolePrimsaSchema } from '@/lib/utils/zod_schema/role';
import { companyOutputSchema } from '@/lib/utils/zod_schema/company';

const statusInfoOutputSchema = z.object({
  user: userOutputSchema.nullable(),
  role: rolePrimsaSchema.nullable(),
  company: companyOutputSchema.nullable(),
});

export const statusInfoGetSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: nullSchema,
  },
  outputSchema: statusInfoOutputSchema,
  frontend: nullSchema,
};
