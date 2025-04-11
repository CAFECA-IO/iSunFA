import prisma from '@/client';
import { ILeaveTeam, TeamRole, LeaveStatus, ITeamMember } from '@/interfaces/team';
import { InviteStatus } from '@prisma/client';
import { IUpdateMemberResponse, IDeleteMemberResponse } from '@/lib/utils/zod_schema/team';
import { IPaginatedData } from '@/interfaces/pagination';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { SortOrder } from '@/constants/sort';
import { z } from 'zod';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { ITeamRoleCanDo, TeamPermissionAction, TeamRoleCanDoKey } from '@/interfaces/permissions';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { updateTeamMemberSession } from '@/lib/utils/session';
import { assertUserIsTeamMember } from '@/lib/utils/repo/team.repo';

export const addMembersToTeam = async (
  teamId: number,
  emails: string[]
): Promise<{ invitedCount: number; failedEmails: string[] }> => {
  const now = Math.floor(Date.now() / 1000);

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const existingUserIds = existingUsers.map((user) => user.id);

  const existingUserEmails = new Set(existingUsers.map((user) => user.email));
  const newUserEmails = emails.filter((email) => !existingUserEmails.has(email));

  try {
    await prisma.$transaction(async (tx) => {
      // Info: (20250307 - Tzuhan) 1️ 找出已經在 team 但 `status = NOT_IN_TEAM` 的成員，並讓他們重新加入
      const inactiveMembers = await tx.teamMember.findMany({
        where: {
          teamId,
          userId: { in: existingUserIds },
          status: LeaveStatus.NOT_IN_TEAM,
        },
        select: { userId: true },
      });

      if (inactiveMembers.length > 0) {
        await tx.teamMember.updateMany({
          where: {
            teamId,
            userId: { in: inactiveMembers.map((m) => m.userId) },
          },
          data: {
            status: LeaveStatus.IN_TEAM,
            leftAt: null,
          },
        });
      }

      // Info: (20250307 - Tzuhan) 2️ 對於真正新的用戶，新增 `teamMember` 記錄
      const newUsersToAdd = existingUsers.filter(
        (user) => !inactiveMembers.some((m) => m.userId === user.id)
      );

      if (newUsersToAdd.length > 0) {
        await tx.teamMember.createMany({
          data: newUsersToAdd.map((user) => ({
            teamId,
            userId: user.id,
            role: TeamRole.EDITOR,
            joinedAt: now,
          })),
          skipDuplicates: true,
        });

        // Info: (20250317 - Tzuhan) 記錄成功加入的用戶
        await tx.inviteTeamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId,
            email: user.email!,
            status: InviteStatus.COMPLETED,
            createdAt: now,
            completedAt: now,
            note: JSON.stringify({
              reason: 'User already exists, added to team without asking',
            }),
          })),
          skipDuplicates: true,
        });
      }

      // Info: (20250307 - Tzuhan) 3️ 對於 `email` 尚未註冊的用戶，新增 `inviteTeamMember`
      if (newUserEmails.length > 0) {
        await tx.inviteTeamMember.createMany({
          data: newUserEmails.map((email) => ({
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
    });
  } catch (error) {
    return { invitedCount: existingUsers.length, failedEmails: newUserEmails };
  }

  return { invitedCount: emails.length, failedEmails: [] };
};

export const memberLeaveTeam = async (userId: number, teamId: number): Promise<ILeaveTeam> => {
  // Info: (20250410 - tzuhan) Step 1. 驗證是否為團隊成員並取得角色
  const role = await assertUserIsTeamMember(userId, teamId);

  // Info: (20250410 - tzuhan) Step 2. 確保 session 中有正確的 teamRole
  await updateTeamMemberSession(userId, teamId, role.actualRole);

  // Info: (20250410 - tzuhan) Special case: OWNER cannot leave the team
  if (role.actualRole === TeamRole.OWNER) {
    throw new Error('OWNER_IS_UNABLE_TO_LEAVE');
  }

  // Info: (20250410 - tzuhan) Check permissions using convertTeamRoleCanDo
  const canLeaveResult = convertTeamRoleCanDo({
    teamRole: role.actualRole as TeamRole,
    canDo: TeamPermissionAction.LEAVE_TEAM,
  });

  if (
    !(TeamRoleCanDoKey.YES_OR_NO in canLeaveResult) ||
    !(canLeaveResult as ITeamRoleCanDo).yesOrNo
  ) {
    throw new Error('PERMISSION_DENIED');
  }

  const leftAt = Math.floor(Date.now() / 1000); // Info: (20250310 - tzuhan) 以 UNIX 時間戳記記錄
  await prisma.teamMember.update({
    where: { teamId_userId: { teamId, userId } },
    data: {
      status: LeaveStatus.NOT_IN_TEAM,
      leftAt,
    },
  });

  return {
    teamId,
    userId,
    role: role.actualRole as TeamRole,
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
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Info: (20250408 - Shirley) 不能更新成員為 OWNER 角色
  if (role === TeamRole.OWNER) {
    throw new Error('CANNOT_UPDATE_TO_OWNER');
  }

  // Info: (20250408 - Shirley) 不能更新 OWNER 角色
  if (teamMember.role === TeamRole.OWNER) {
    throw new Error('CANNOT_UPDATE_OWNER_ROLE');
  }

  // Info: (20250408 - Shirley) 檢查用戶是否有權限變更角色
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: sessionUserTeamRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!(TeamRoleCanDoKey.CAN_ALTER in canChangeRoleResult)) {
    throw new Error('PERMISSION_DENIED');
  }

  // Info: (20250408 - Shirley) 檢查用戶是否可以設置成員為目標角色
  const canAlterRoles = canChangeRoleResult.canAlter;
  if (!canAlterRoles.includes(role)) {
    throw new Error('CANNOT_ASSIGN_THIS_ROLE');
  }

  // Info: (20250408 - Shirley) Admin 不能更新 Admin 角色 (特殊情況)
  if (sessionUserTeamRole === TeamRole.ADMIN && teamMember.role === TeamRole.ADMIN) {
    throw new Error('ADMIN_CANNOT_UPDATE_ADMIN_OR_OWNER');
  }

  // Info: (20250408 - Shirley) Admin 不能將成員提升為 Admin
  if (sessionUserTeamRole === TeamRole.ADMIN && role === TeamRole.ADMIN) {
    throw new Error('ADMIN_CANNOT_PROMOTE_TO_ADMIN');
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
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Info: (20250408 - Shirley) 不能刪除 OWNER
  if (teamMember.role === TeamRole.OWNER) {
    throw new Error('CANNOT_DELETE_OWNER');
  }

  // Info: (20250408 - Shirley) 檢查用戶是否有權限變更角色
  const canChangeRoleResult = convertTeamRoleCanDo({
    teamRole: sessionUserTeamRole,
    canDo: TeamPermissionAction.CHANGE_TEAM_ROLE,
  });

  if (!(TeamRoleCanDoKey.CAN_ALTER in canChangeRoleResult)) {
    throw new Error('PERMISSION_DENIED');
  }

  if (sessionUserTeamRole === TeamRole.ADMIN && teamMember.role === TeamRole.ADMIN) {
    throw new Error('ADMIN_CANNOT_DELETE_ADMIN');
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
  teamId: number,
  queryParams: z.infer<typeof paginatedDataQuerySchema>
): Promise<IPaginatedData<ITeamMember[]>> => {
  const { page, pageSize } = queryParams;

  // Info: (20250321 - Tzuhan) 計算總成員數量
  const totalCount = await prisma.teamMember.count({
    where: { teamId, status: LeaveStatus.IN_TEAM },
  });

  // Info: (20250321 - Tzuhan) 取得成員列表
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId, status: LeaveStatus.IN_TEAM },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          imageFile: { select: { url: true } },
        },
      },
    },
    orderBy: { joinedAt: SortOrder.ASC },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Info: (20250321 - Tzuhan) **確保 `teamMembers` 是同步陣列**
  const formattedMembers: ITeamMember[] = teamMembers.map((member) => ({
    id: String(member.id),
    name: member.user.name || '',
    email: member.user.email || '',
    imageId: member.user.imageFile?.url ?? '',
    role: member.role as TeamRole,
    editable: Boolean(
      (
        convertTeamRoleCanDo({
          teamRole: member.role as TeamRole,
          canDo: TeamPermissionAction.LEAVE_TEAM,
        }) as ITeamRoleCanDo
      )?.yesOrNo
    ),
  }));

  // Info: (20250321 - Tzuhan) **確保 `toPaginatedData` 不是 `Promise`**
  const paginatedResult = toPaginatedData({
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    data: formattedMembers, // Info: (20250321 - Tzuhan) 確保這裡是同步 `ITeamMember[]`
  });

  return paginatedResult; // Info: (20250321 - Tzuhan) 直接返回，避免 `Promise<IPaginatedData<ITeamMember>>`
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
