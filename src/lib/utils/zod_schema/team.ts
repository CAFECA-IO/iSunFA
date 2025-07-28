import { TPlanType } from '@/interfaces/subscription';
import { LeaveStatus, TeamRole, TransferStatus } from '@/interfaces/team';
import { z } from 'zod';
import { paginatedDataQuerySchema, paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';

export const TeamSchema = z.object({
  id: z.number(),
  imageId: z.string(),
  role: z.nativeEnum(TeamRole),
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
    value: z.nativeEnum(TPlanType),
    editable: z.boolean(),
  }),
  totalMembers: z.number(),
  totalAccountBooks: z.number(),
  bankAccount: z.object({
    value: z.string(),
    editable: z.boolean(),
  }),
  expiredAt: z.number().default(0),
  inGracePeriod: z.boolean(),
  gracePeriodEndAt: z.number().default(0),
});

export const ITeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageId: z.string(),
  email: z.string(),
  role: z.nativeEnum(TeamRole),
  editable: z.boolean(),
});

export const getByTeamIdSchema = z.object({
  teamId: zodStringToNumber,
});

export const listByTeamIdQuerySchema = paginatedDataQuerySchema.extend({
  teamId: zodStringToNumber,
});

export const addMemberBodySchema = z.object({
  emails: z.array(z.string().email()).min(1, '至少需要邀請一名成員'),
});

export const addMemberResponseSchema = z.object({
  invitedCount: z.number(),
  unregisteredEmails: z.array(z.string().email()),
});

export const requestTransferAccountBookQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

export const transferAccountBookSchema = z.object({
  accountBookId: z.number(),
  fromTeamId: z.number(),
  toTeamId: z.number(),
  status: z.nativeEnum(TransferStatus),
  transferredAt: z.number().optional(),
});

export const leaveTeamSchema = z.object({
  teamId: z.number(),
  userId: z.number(),
  role: z.nativeEnum(TeamRole),
  status: z.nativeEnum(LeaveStatus),
  leftAt: z.number().optional(),
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
  role: z.nativeEnum(TeamRole),
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

export const listTeamQuerySchema = paginatedDataQuerySchema.extend({
  canCreateAccountBookOnly: z.coerce.boolean().optional(),
  syncSession: z.coerce.boolean().optional(),
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
        planType: z.nativeEnum(TPlanType).optional().default(TPlanType.BEGINNER),
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
      querySchema: listTeamQuerySchema,
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
  acceptInvitation: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: z.object({
      teamId: z.number(),
      userId: z.number(),
      role: z.nativeEnum(TeamRole),
      status: z.nativeEnum(LeaveStatus),
    }),
    frontend: z.object({
      teamId: z.number(),
      userId: z.number(),
      role: z.nativeEnum(TeamRole),
      status: z.nativeEnum(LeaveStatus),
    }),
  },
  declineInvitation: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: z.object({}).optional(),
    },
    outputSchema: z.object({
      teamId: z.number(),
      userId: z.number(),
      role: z.nativeEnum(TeamRole),
      status: z.nativeEnum(LeaveStatus),
    }),
    frontend: z.object({
      teamId: z.number(),
      userId: z.number(),
      role: z.nativeEnum(TeamRole),
      status: z.nativeEnum(LeaveStatus),
    }),
  },
  leaveTeam: {
    input: {
      querySchema: getByTeamIdSchema,
      bodySchema: nullSchema,
    },
    outputSchema: leaveTeamSchema,
    frontend: leaveTeamSchema,
  },
  requestTransferAccountBook: {
    input: {
      querySchema: requestTransferAccountBookQuerySchema,
      bodySchema: z.object({
        fromTeamId: z.number(),
        toTeamId: z.number(),
      }),
    },
    outputSchema: transferAccountBookSchema,
    frontend: transferAccountBookSchema,
  },
  cancelTransferAccountBook: {
    input: {
      querySchema: requestTransferAccountBookQuerySchema,
      bodySchema: nullSchema,
    },
    outputSchema: transferAccountBookSchema,
    frontend: transferAccountBookSchema,
  },
  acceptTransferAccountBook: {
    input: {
      querySchema: requestTransferAccountBookQuerySchema,
      bodySchema: nullSchema,
    },
    outputSchema: transferAccountBookSchema,
    frontend: transferAccountBookSchema,
  },
  declineTransferAccountBook: {
    input: {
      querySchema: requestTransferAccountBookQuerySchema,
      bodySchema: nullSchema,
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
