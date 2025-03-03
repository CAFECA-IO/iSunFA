import { TPlanType } from '@/interfaces/subscription';
import { LeaveStatus, TeamRole, TransferStatus } from '@/interfaces/team';
import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
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

// Info: (20250227 - Shirley) 定義更新團隊資訊的 Schema
export const updateTeamBodySchema = z.object({
  name: z.string().optional(),
  about: z.string().optional(),
  profile: z.string().optional(),
  bankInfo: z
    .object({
      code: z.string(),
      account: z.string(),
    })
    .optional(),
});

// Info: (20250227 - Shirley) 定義更新團隊資訊的回應 Schema
export const updateTeamResponseSchema = z.union([
  z.object({
    id: z.number(),
    name: z.string(),
    about: z.string(),
    profile: z.string(),
    bankInfo: z.object({
      code: z.string(),
      account: z.string(),
    }),
  }),
  z.null(),
]);

// Info: (20250227 - Shirley) 定義更新團隊成員角色的 Schema，OWNER 不能透過更新 member 修改
export const updateMemberBodySchema = z.object({
  role: z.enum([TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER]),
});

// Info: (20250227 - Shirley) 定義更新團隊成員角色的回應 Schema
export const updateMemberResponseSchema = z.union([
  z.object({
    id: z.number(),
    userId: z.number(),
    teamId: z.number(),
    role: z.string(),
    email: z.string(),
    name: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),
  z.null(),
]);

// Info: (20250227 - Shirley) 定義刪除團隊成員的回應 Schema
export const deleteMemberResponseSchema = z.union([
  z.object({
    memberId: z.number(),
  }),
  z.null(),
]);

/**
 * Info: (20250303 - Shirley)
 * @note used in APIName.PUT_TEAM_ICON
 */
const teamPutIconQuerySchema = z.object({
  teamId: zodStringToNumber,
});

const teamPutIconBodySchema = z.object({
  fileId: z.number().int(),
});

const teamPictureSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  imageId: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const teamPutIconSchema = {
  input: {
    querySchema: teamPutIconQuerySchema,
    bodySchema: teamPutIconBodySchema,
  },
  outputSchema: teamPictureSchema.nullable(),
  frontend: teamPictureSchema,
};

export const teamSchemas = {
  create: {
    input: {
      querySchema: nullSchema,
      bodySchema: z.object({
        name: z.string(),
        members: z.array(z.string().email()).optional(),
        planType: z.enum(Object.values(TPlanType) as [TPlanType, ...TPlanType[]]).optional(),
        about: z.string().optional(),
        profile: z.string().optional(),
        bankInfo: z.object({ code: z.number(), number: z.string() }).optional(),
        imageFileId: z.number().optional(),
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
  update: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: updateTeamBodySchema,
    },
    outputSchema: updateTeamResponseSchema,
    frontend: updateTeamResponseSchema,
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
  updateMember: {
    input: {
      querySchema: z.object({
        teamId: zodStringToNumber,
        memberId: zodStringToNumber,
      }),
      bodySchema: updateMemberBodySchema,
    },
    outputSchema: updateMemberResponseSchema,
    frontend: updateMemberResponseSchema,
  },
  deleteMember: {
    input: {
      querySchema: z.object({
        teamId: zodStringToNumber,
        memberId: zodStringToNumber,
      }),
      bodySchema: nullSchema,
    },
    outputSchema: deleteMemberResponseSchema,
    frontend: deleteMemberResponseSchema,
  },
  putIcon: teamPutIconSchema,
};

// Info: (20250227 - Shirley) 導出更新團隊資訊的類型
export type IUpdateTeamBody = z.infer<typeof updateTeamBodySchema>;
export type IUpdateTeamResponse = z.infer<typeof updateTeamResponseSchema>;

// Info: (20250227 - Shirley) 導出更新團隊成員角色的類型
export type IUpdateMemberBody = z.infer<typeof updateMemberBodySchema>;
export type IUpdateMemberResponse = z.infer<typeof updateMemberResponseSchema>;

// Info: (20250227 - Shirley) 導出刪除團隊成員的類型
export type IDeleteMemberResponse = z.infer<typeof deleteMemberResponseSchema>;
