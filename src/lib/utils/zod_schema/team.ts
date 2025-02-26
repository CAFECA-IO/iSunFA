import { TPlanType } from '@/interfaces/subscription';
import { TeamRole } from '@/interfaces/team';
import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { paginatedCompanyAndroleOutputSchema } from '@/lib/utils/zod_schema/company';

export const TeamSchema = z.object({
  id: z.string(),
  imageId: z.string(),
  role: z.enum(Object.values(TeamRole) as [TeamRole, ...TeamRole[]]),
  name: z.object({
    value: z.string(),
    editable: z.boolean(),
  }),
  about: z.object({
    value: z.string(),
    editable: z.boolean(),
  }),
  profile: z.object({
    value: z.string(),
    editable: z.boolean(),
  }),
  planType: z.object({
    value: z.enum(Object.values(TPlanType) as [TPlanType, ...TPlanType[]]),
    editable: z.boolean(),
  }),
  totalMembers: z.number(),
  totalAccountBooks: z.number(),
  bankAccount: z.object({
    value: z.string(),
    editable: z.boolean(),
  }),
});

export const ITeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageId: z.string(),
  email: z.string(),
  role: z.enum(Object.values(TeamRole) as [TeamRole, ...TeamRole[]]),
  editable: z.boolean(),
});

export const getByTeamIdSchema = z.object({
  teamId: z.string(),
});

export const listByTeamIdQuerySchema = paginatedDataQuerySchema.extend({
  teamId: z.string(),
});

export const teamSchemas = {
  list: {
    input: {
      querySchema: paginatedDataQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedDataSchema(TeamSchema),
    frontend: nullSchema,
  },
  get: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: TeamSchema,
    frontend: nullSchema,
  },
  listAccountBook: {
    input: {
      querySchema: listByTeamIdQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedCompanyAndroleOutputSchema,
    frontend: nullSchema,
  },
  listMember: {
    input: {
      querySchema: listByTeamIdQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedDataSchema(ITeamMemberSchema),
    frontend: nullSchema,
  },
};
