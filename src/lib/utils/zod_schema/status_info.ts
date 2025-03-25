import { z } from 'zod';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { userOutputSchema } from '@/lib/utils/zod_schema/user';
import { rolePrismaSchema } from '@/lib/utils/zod_schema/role';
import { companyOutputSchema } from '@/lib/utils/zod_schema/company';
import { TeamSchema } from '@/lib/utils/zod_schema/team';

const statusInfoOutputSchema = z.object({
  user: userOutputSchema.nullable(),
  role: rolePrismaSchema.nullable(),
  company: companyOutputSchema.nullable(),
  team: TeamSchema.nullable(),
  teams: z.array(TeamSchema).nullable(),
});

export const statusInfoGetSchema = {
  input: {
    querySchema: nullSchema,
    bodySchema: nullSchema,
  },
  outputSchema: statusInfoOutputSchema,
  frontend: nullSchema,
};
