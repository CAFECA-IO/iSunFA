import prisma from '@/client';
import { ILeaveTeam, TeamRole, LeaveStatus, ITeamMember } from '@/interfaces/team';
import { InviteStatus } from '@prisma/client';
import { IUpdateMemberResponse, IDeleteMemberResponse } from '@/lib/utils/zod_schema/team';
import { IPaginatedData } from '@/interfaces/pagination';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { SortOrder } from '@/constants/sort';
import { z } from 'zod';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import {
  assertUserCan,
  assertUserIsTeamMember,
} from '@/lib/utils/permission/assert_user_team_permission';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { EmailTemplateName } from '@/constants/email_template';
import { transaction } from '@/lib/utils/repo/transaction';
import { checkTeamMemberLimit } from '@/lib/utils/plan/check_plan_limit';
import { NotificationEvent, NotificationType } from '@/interfaces/notification';
import { createNotificationsBulk } from '@/lib/utils/repo/notification.repo';
import loggerBack from '@/lib/utils/logger_back';

export const addMembersToTeam = async (
  userId: number,
  teamId: number,
  emails: string[]
): Promise<{ invitedCount: number; unregisteredEmails: string[] }> => {
  const { can } = await assertUserCan({
    userId,
    teamId,
    action: TeamPermissionAction.INVITE_MEMBER,
  });
  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }
  await checkTeamMemberLimit(teamId, emails.length);

  const now = getTimestampNow();

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const existingUserEmails = new Set(
    existingUsers.map((u) => u.email).filter((email): email is string => !!email)
  );
  const existingUserIds = new Set(existingUsers.map((u) => u.id));
  const unregisteredEmails = emails.filter((email) => !existingUserEmails.has(email));

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    include: { imageFile: true },
  });
  try {
    await transaction(async (tx) => {
      const teamMembers = await tx.teamMember.findMany({
        where: {
          teamId,
          userId: { in: [...existingUserIds] },
        },
        select: { userId: true, status: true },
      });

      const alreadyInTeamIds = new Set(
        teamMembers.filter((m) => m.status === LeaveStatus.IN_TEAM).map((m) => m.userId)
      );

      const usersToInvite = existingUsers
        .filter((user) => !alreadyInTeamIds.has(user.id))
        .map((user) => {
          const prevStatus = teamMembers.find((m) => m.userId === user.id)?.status;
          return {
            ...user,
            inviteNote: JSON.stringify({
              reason:
                prevStatus === LeaveStatus.NOT_IN_TEAM
                  ? 'User previously left the team, waiting for rejoin approval'
                  : 'User exists, waiting for accept',
            }),
          };
        });

      loggerBack.info(`usersToInvite: ${JSON.stringify(usersToInvite)}`);

      if (usersToInvite.length > 0) {
        const result = await tx.inviteTeamMember.createMany({
          data: usersToInvite.map((user) => ({
            teamId,
            email: user.email!,
            status: InviteStatus.PENDING,
            createdAt: now,
            note: user.inviteNote,
          })),
          // skipDuplicates: true,
        });
        loggerBack.info(`🔍 createMany result: ${JSON.stringify(result)}`);
      }

      if (unregisteredEmails.length > 0) {
        await tx.inviteTeamMember.createMany({
          data: unregisteredEmails.map((email) => ({
            teamId,
            email,
            status: InviteStatus.PENDING,
            createdAt: now,
            note: JSON.stringify({
              reason:
                'User not exists, pending for join, when user register, will be added to team',
            }),
          })),
          skipDuplicates: true,
        });
      }

      // Info: (20250421 - tzuhan) 寫入 emailJob
      const inviteLinkBase = `${process.env.NEXTAUTH_URL}/users/login`;

      const userEmailMap = [
        ...existingUsers.map((user) => ({
          userId: user.id,
          email: user.email!,
        })),
        ...unregisteredEmails.map((email) => ({
          userId: undefined,
          email,
        })),
      ];

      await createNotificationsBulk(tx, {
        userEmailMap,
        template: EmailTemplateName.INVITE,
        teamId,
        type: NotificationType.INVITATION,
        event: NotificationEvent.INVITED,
        title: '加入團隊通知',
        message: `${inviter?.name ?? '某人'} 邀請您加入團隊「${team?.name ?? ''}」`,
        content: {
          inviterName: inviter?.name || '有人',
          teamName: team?.name || '某團隊',
          inviteLink: `${inviteLinkBase}`,
        },
        actionUrl: `/team/${teamId}`,
        imageUrl: inviter?.imageFile?.url,
        pushPusher: process.env.TEST_TYPE !== 'integration',
        sendEmail: process.env.TEST_TYPE !== 'integration',
      });
    });
  } catch (err) {
    loggerBack.error(`❌ Failed to add member to team inside transaction`);
    loggerBack.error(err);
    throw err; // 保持 rollback 行為
  }

  return {
    invitedCount: emails.length,
    unregisteredEmails,
  };
};

export const memberLeaveTeam = async (userId: number, teamId: number): Promise<ILeaveTeam> => {
  // Info: (20250410 - tzuhan) Step 1. 驗證成員身份與實際角色
  const { actualRole, can } = await assertUserCan({
    userId,
    teamId,
    action: TeamPermissionAction.LEAVE_TEAM,
  });

  // Info: (20250410 - tzuhan) Step 2. OWNER 不能離開團隊
  if (actualRole === TeamRole.OWNER) {
    const error = new Error(STATUS_MESSAGE.OWNER_IS_UNABLE_TO_LEAVE);
    error.name = STATUS_CODE.OWNER_IS_UNABLE_TO_LEAVE;
    throw error;
  }

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  // Info: (20250410 - tzuhan) Step 3. 檢查是否有 LEAVE_TEAM 權限
  const canLeave = convertTeamRoleCanDo({
    teamRole: actualRole,
    canDo: TeamPermissionAction.LEAVE_TEAM,
  });

  if (!canLeave || !canLeave.can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  // Info: (20250410 - tzuhan) Step 4. 更新離開狀態
  const leftAt = getTimestampNow();
  await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: {
      status: LeaveStatus.NOT_IN_TEAM,
      leftAt,
    },
  });

  // Info: (20250410 - tzuhan) Step 5. 回傳離開資訊
  return {
    teamId,
    userId,
    role: actualRole,
    status: LeaveStatus.NOT_IN_TEAM,
    leftAt,
  };
};

/**
 * Info: (20250312 - Shirley) 更新團隊成員角色
 * @param teamId 團隊 ID
 * @param memberId 成員 ID
 * @param role 新角色
 * @param sessionUserTeamRole 當前用戶在團隊中的角色
 * @returns 更新後的成員資訊
 */
export const updateMemberById = async (
  teamId: number,
  memberId: number,
  role: TeamRole,
  sessionUserTeamRole: TeamRole
): Promise<IUpdateMemberResponse> => {
  // Info: (20250312 - Shirley) 檢查要更新的成員是否存在
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!teamMember) {
    const error = new Error(STATUS_MESSAGE.MEMBER_NOT_FOUND);
    error.name = STATUS_CODE.MEMBER_NOT_FOUND;
    throw error;
  }

  // Info: (20250408 - Shirley) 不能更新成員為 OWNER 角色
  if (role === TeamRole.OWNER) {
    const error = new Error(STATUS_MESSAGE.CANNOT_UPDATE_TO_OWNER);
    error.name = STATUS_CODE.CANNOT_UPDATE_TO_OWNER;
    throw error;
  }

  // Info: (20250408 - Shirley) 不能更新 OWNER 角色
  if (teamMember.role === TeamRole.OWNER) {
    const error = new Error(STATUS_MESSAGE.CANNOT_UPDATE_OWNER_ROLE);
    error.name = STATUS_CODE.CANNOT_UPDATE_OWNER_ROLE;
    throw error;
  }

  // Info: (20250408 - Shirley) 檢查用戶是否有權限變更角色
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: sessionUserTeamRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!canChangeRoleResult.alterableRoles) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  // Info: (20250408 - Shirley) 檢查用戶是否可以設置成員為目標角色
  const canAlterRoles = canChangeRoleResult.alterableRoles;
  if (!canAlterRoles.includes(role)) {
    const error = new Error(STATUS_MESSAGE.CANNOT_ASSIGN_THIS_ROLE);
    error.name = STATUS_CODE.CANNOT_ASSIGN_THIS_ROLE;
    throw error;
  }

  // Info: (20250408 - Shirley) Admin 不能更新 Admin 角色 (特殊情況)
  if (sessionUserTeamRole === TeamRole.ADMIN && teamMember.role === TeamRole.ADMIN) {
    const error = new Error(STATUS_MESSAGE.ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER);
    error.name = STATUS_CODE.ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER;
    throw error;
  }

  // Info: (20250408 - Shirley) Admin 不能將成員提升為 Admin
  if (sessionUserTeamRole === TeamRole.ADMIN && role === TeamRole.ADMIN) {
    const error = new Error(STATUS_MESSAGE.ADMIN_CANNOT_PROMOTE_TO_ADMIN);
    error.name = STATUS_CODE.ADMIN_CANNOT_PROMOTE_TO_ADMIN;
    throw error;
  }

  const updatedMember = await prisma.teamMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    id: updatedMember.id,
    userId: updatedMember.user.id,
    teamId,
    role: updatedMember.role,
    email: updatedMember.user.email || '',
    name: updatedMember.user.name || '',
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  };
};

/**
 * Info: (20250312 - Shirley) 刪除團隊成員（軟刪除）
 * @param teamId 團隊 ID
 * @param memberId 成員 ID
 * @param sessionUserTeamRole 當前用戶在團隊中的角色
 * @returns 被刪除的成員 ID
 */
export const deleteMemberById = async (
  teamId: number,
  memberId: number,
  sessionUserTeamRole: TeamRole
): Promise<IDeleteMemberResponse> => {
  // Info: (20250312 - Shirley) 檢查要刪除的成員是否存在
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!teamMember) {
    const error = new Error(STATUS_MESSAGE.MEMBER_NOT_FOUND);
    error.name = STATUS_CODE.MEMBER_NOT_FOUND;
    throw error;
  }

  // Info: (20250408 - Shirley) 不能刪除 OWNER
  if (teamMember.role === TeamRole.OWNER) {
    const error = new Error(STATUS_MESSAGE.CANNOT_DELETE_OWNER);
    error.name = STATUS_CODE.CANNOT_DELETE_OWNER;
    throw error;
  }

  // Info: (20250408 - Shirley) 檢查用戶是否有權限變更角色
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: sessionUserTeamRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!canChangeRoleResult.alterableRoles) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  if (sessionUserTeamRole === TeamRole.ADMIN && teamMember.role === TeamRole.ADMIN) {
    const error = new Error(STATUS_MESSAGE.ADMIN_CANNOT_DELETE_ADMIN);
    error.name = STATUS_CODE.ADMIN_CANNOT_DELETE_ADMIN;
    throw error;
  }

  // Info: (20250312 - Shirley) 執行軟刪除
  const now = Math.floor(Date.now() / 1000);
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      status: LeaveStatus.NOT_IN_TEAM,
      leftAt: now,
    },
  });

  return {
    memberId: teamMember.user.id,
  };
};

/**
 * Info: (20250321 - Tzuhan) 取得指定團隊的所有成員
 * @param teamId 團隊 ID
 * @param queryParams 分頁、搜尋等參數
 * @returns 符合 ITeamMemberSchema 的成員列表（分頁）
 */
export const listTeamMemberByTeamId = async (
  userId: number,
  teamId: number,
  queryParams: z.infer<typeof paginatedDataQuerySchema>
): Promise<IPaginatedData<ITeamMember[]>> => {
  const { effectiveRole } = await assertUserIsTeamMember(userId, teamId);
  if (!effectiveRole) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const { page, pageSize } = queryParams;

  // Info: (20250321 - Tzuhan) Step 1: 取得總成員數
  const totalCount = await prisma.teamMember.count({
    where: {
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
  });

  // Info: (20250321 - Tzuhan) Step 2: 取得分頁成員資料
  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          imageFile: {
            select: { url: true },
          },
        },
      },
    },
    orderBy: {
      joinedAt: SortOrder.ASC,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Info: (20250321 - Tzuhan) Step 3: 格式化成符合 ITeamMember 結構的資料
  const formatted: ITeamMember[] = members.map((member) => {
    const { user, role } = member;
    const isEditable = convertTeamRoleCanDo({
      teamRole: role as TeamRole,
      canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
    })?.can;

    return {
      id: String(member.id),
      name: user.name || '',
      email: user.email || '',
      imageId: user.imageFile?.url ?? '',
      role: role as TeamRole,
      editable: isEditable,
    };
  });

  // Info: (20250321 - Tzuhan) Step 4: 使用工具函式包裝成分頁格式
  return toPaginatedData({
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    data: formatted,
  });
};

/**
 * Info: (20250324 - Shirley) 獲取用戶所屬的所有團隊及其角色
 * @param userId 用戶 ID
 * @returns 包含用戶所屬團隊 ID 和角色的陣列
 */
export const getUserTeams = async (userId: number): Promise<{ id: number; role: string }[]> => {
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      userId,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      teamId: true,
      role: true,
    },
  });

  return teamMembers.map((member) => ({
    id: member.teamId,
    role: member.role,
  }));
};

/**
 * Info: (20250325 - Shirley) 獲取用戶在特定團隊中的角色
 * @param userId 用戶 ID
 * @param teamId 團隊 ID
 * @returns 用戶在團隊中的角色，如果不是團隊成員則返回 null
 */
export const getUserRoleInTeam = async (
  userId: number,
  teamId: number
): Promise<TeamRole | null> => {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      role: true,
    },
  });

  return teamMember ? (teamMember.role as TeamRole) : null;
};

/**
 * Info: (20250428 - Shirley) 檢查用戶是否為特定團隊的成員
 * @param userId 用戶 ID
 * @param teamId 團隊 ID
 * @returns 如果用戶是團隊成員則返回 true，否則返回 false
 */
export const isUserTeamMember = async (userId: number, teamId: number): Promise<boolean> => {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      id: true,
    },
  });

  return !!teamMember;
};

/**
 * Info: (20250531 - Shirley) 獲取已存在並被加入到特定團隊的用戶列表
 * @param teamId 團隊 ID
 * @param emails 電子郵件列表
 * @returns 存在且被加入團隊的用戶 ID 列表
 */
export const getExistingUsersInTeam = async (
  teamId: number,
  emails: string[]
): Promise<number[]> => {
  const existingUsers = await prisma.user.findMany({
    where: {
      email: { in: emails },
      memberships: {
        some: {
          teamId,
        },
      },
    },
    select: { id: true },
  });

  return existingUsers.map((user) => user.id);
};

export const acceptTeamInvitation = async (userId: number, teamId: number): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    const error = new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    error.name = STATUS_CODE.UNAUTHORIZED_ACCESS;
    throw error;
  }

  const invitation = await prisma.inviteTeamMember.findFirst({
    where: {
      teamId,
      email: user.email,
      status: InviteStatus.PENDING,
    },
  });

  loggerBack.info(
    `🔍 invitation: ${JSON.stringify(invitation)}, teamId: ${teamId}, email: ${user.email}`
  );

  if (!invitation) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const now = getTimestampNow();

  await prisma.$transaction([
    prisma.teamMember.create({
      data: {
        teamId,
        userId,
        role: TeamRole.EDITOR, // Info: (20250523 - tzuhan) 預設角色
        joinedAt: now,
      },
    }),
    prisma.inviteTeamMember.update({
      where: { id: invitation.id },
      data: {
        status: InviteStatus.COMPLETED,
        completedAt: now,
      },
    }),
  ]);
};

export const declineTeamInvitation = async (userId: number, teamId: number): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) {
    const error = new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
    error.name = STATUS_CODE.UNAUTHORIZED_ACCESS;
    throw error;
  }

  const invitation = await prisma.inviteTeamMember.findFirst({
    where: {
      teamId,
      email: user.email,
      status: InviteStatus.PENDING,
    },
  });

  if (!invitation) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  await prisma.inviteTeamMember.update({
    where: { id: invitation.id },
    data: {
      status: InviteStatus.DECLINED,
      declinedAt: getTimestampNow(),
    },
  });
};
