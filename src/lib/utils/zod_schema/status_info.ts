import { z } from 'zod';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { userOutputSchema } from '@/lib/utils/zod_schema/user';
import { companyOutputSchema } from '@/lib/utils/zod_schema/company';
import { TeamSchema } from '@/lib/utils/zod_schema/team';
import { userRoleOutputSchema } from '@/lib/utils/zod_schema/user_role';

const statusInfoOutputSchema = z.object({
  user: userOutputSchema.nullable(),
  role: userRoleOutputSchema.nullable(),
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
