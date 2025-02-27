import { TPlanType } from '@/interfaces/subscription';
import { LeaveStatus, TeamRole, TransferStatus } from '@/interfaces/team';
import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import { paginatedAccountBookForUserSchema } from '@/lib/utils/zod_schema/company';

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

export const addMemberBodySchema = z.array(z.string().email()).min(1, '至少需要邀請一名成員');

export const addMemberResponseSchema = z.object({
  invitedCount: z.number(),
  failedEmails: z.array(z.string().email()),
});

export const transferAccountBookSchema = z.object({
  accountBookId: z.string(),
  previousTeamId: z.string(),
  targetTeamId: z.string(),
  status: z.enum(Object.values(TransferStatus) as [TransferStatus, ...TransferStatus[]]),
  transferedAt: z.number().optional(),
});

export const leaveTeamSchema = z.object({
  teamId: z.string(),
  userId: z.number(),
  role: z.enum(Object.values(TeamRole) as [TeamRole, ...TeamRole[]]),
  status: z.enum(Object.values(LeaveStatus) as [LeaveStatus, ...LeaveStatus[]]),
  leavedAt: z.number().optional(),
});

export const teamSchemas = {
  create: {
    input: {
      querySchema: nullSchema,
      bodySchema: z.object({
        name: z.string(),
        members: z.array(z.string().email()).optional(),
        planType: z.enum(Object.values(TPlanType) as [TPlanType, ...TPlanType[]]),
        about: z.string().optional(),
        profile: z.string().optional(),
        bankInfo: z.object({ code: z.number(), number: z.string() }).optional(),
      }),
    },
    outputSchema: TeamSchema,
    frontend: TeamSchema,
  },
  list: {
    input: {
      querySchema: paginatedDataQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedDataSchema(TeamSchema),
    frontend: paginatedDataSchema(TeamSchema),
  },
  get: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: TeamSchema,
    frontend: TeamSchema,
  },
  listAccountBook: {
    input: {
      querySchema: listByTeamIdQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedAccountBookForUserSchema,
    frontend: paginatedAccountBookForUserSchema,
  },
  listMember: {
    input: {
      querySchema: listByTeamIdQuerySchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: paginatedDataSchema(ITeamMemberSchema),
    frontend: paginatedDataSchema(ITeamMemberSchema),
  },
  addMember: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: addMemberBodySchema,
    },
    outputSchema: addMemberResponseSchema,
    frontend: addMemberResponseSchema,
  },
  leaveTeam: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: leaveTeamSchema,
    frontend: leaveTeamSchema,
  },
  transferAccountBook: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({
        targetTeamId: z.string(),
      }),
    },
    outputSchema: transferAccountBookSchema,
    frontend: transferAccountBookSchema,
  },
};
