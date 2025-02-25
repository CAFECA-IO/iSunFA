import { TPlanType } from '@/interfaces/subscription';
import { TeamRole } from '@/interfaces/team';
import { z } from 'zod';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

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
export const nullSchema = z.union([z.object({}), z.string(), z.undefined()]);
export const ITeamGetQueryValidator = z.object({
  teamId: z.string(),
});

export const teamSchemas = {
  list: {
    input: {
      querySchema: nullSchema,
      bodySchema: nullSchema,
    },
    outputSchema: paginatedDataSchema(TeamSchema),
    frontend: nullSchema,
  },
  get: {
    input: {
      querySchema: ITeamGetQueryValidator,
      bodySchema: nullSchema,
    },
    outputSchema: TeamSchema,
    frontend: nullSchema,
  },
  listAccountBook: {
    input: {
      querySchema: nullSchema,
      bodySchema: nullSchema,
    },
    outputSchema: nullSchema,
    frontend: nullSchema,
  },
  listMember: {
    input: {
      querySchema: nullSchema,
      bodySchema: nullSchema,
    },
    outputSchema: nullSchema,
    frontend: nullSchema,
  },
};
