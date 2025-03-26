import { z } from 'zod';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { userOutputSchema } from '@/lib/utils/zod_schema/user';
import { TeamSchema } from '@/lib/utils/zod_schema/team';
import { userRoleOutputSchema } from '@/lib/utils/zod_schema/user_role';
import { accountBookWithTeamSchema } from '@/lib/utils/zod_schema/account_book';

const statusInfoOutputSchema = z.object({
  user: userOutputSchema.nullable(),
  company: accountBookWithTeamSchema.nullable(),
  role: userRoleOutputSchema.nullable(),
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
