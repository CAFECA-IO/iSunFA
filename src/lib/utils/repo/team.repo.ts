import prisma from '@/client';
import { addMonths, getUnixTime } from 'date-fns';
import { ITeam, TeamRole, LeaveStatus } from '@/interfaces/team';
import { InviteStatus } from '@prisma/client';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { createOrderByList } from '@/lib/utils/sort';
import { ITeamRoleCanDo, MAX_TEAM_LIMIT, TeamPermissionAction } from '@/interfaces/permissions';
import { getTimestampNow } from '@/lib/utils/common';
import { listTeamQuerySchema } from '@/lib/utils/zod_schema/team';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import loggerBack from '@/lib/utils/logger_back';
import { updateTeamMemberSession } from '@/lib/utils/session';

export const getTeamList = async (
  userId: number,
  queryParams: z.infer<typeof listTeamQuerySchema>
): Promise<IPaginatedOptions<ITeam[]>> => {
  const {
    page,
    pageSize,
    startDate,
    endDate,
    searchQuery,
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
    canCreateAccountBookOnly = false,
    syncSession = true,
  } = queryParams;

  const nowInSecond = getTimestampNow();

  const [totalCount, teams] = await prisma.$transaction([
    prisma.team.count({
      where: {
        members: { some: { userId, status: LeaveStatus.IN_TEAM } },
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      },
    }),
    prisma.team.findMany({
      where: {
        members: { some: { userId, status: LeaveStatus.IN_TEAM } },
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      },
      include: {
        members: { where: { userId }, select: { id: true, role: true } },
        accountBook: true,
        subscriptions: {
          where: {
            startDate: { lte: nowInSecond },
            expiredDate: { gt: nowInSecond },
          },
          include: { plan: true },
        },
        imageFile: { select: { id: true, url: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption),
    }),
  ]);

  const updatedSessionPromises: Promise<void>[] = [];

  const teamData = teams
    .map((team) => {
      const role = (team.members[0]?.role as TeamRole) ?? TeamRole.VIEWER;

      // Info: (20250410 - tzuhan) 如果需要同步 session，就先準備 Promise
      if (syncSession) {
        updatedSessionPromises.push(updateTeamMemberSession(userId, team.id, role));
      }

      const permissionCheck = convertTeamRoleCanDo({
        teamRole: role,
        canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
      });

      const hasPermission = (permissionCheck as ITeamRoleCanDo).yesOrNo === true;

      if (canCreateAccountBookOnly && !hasPermission) return null;

      return {
        id: team.id,
        imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
        role,
        name: { value: team.name, editable: role !== TeamRole.VIEWER },
        about: { value: team.about || '', editable: role !== TeamRole.VIEWER },
        profile: { value: team.profile || '', editable: role !== TeamRole.VIEWER },
        planType: {
          value: (team.subscriptions[0]?.plan.type as TPlanType) ?? TPlanType.BEGINNER,
          editable: false,
        },
        totalMembers: team.members.length,
        totalAccountBooks: team.accountBook.length,
        bankAccount: {
          value: team.bankInfo
            ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
            : '',
          editable: role !== TeamRole.VIEWER,
        },
        // ToDo: (20250330 - Luphia) 需從團隊訂閱狀態取得資料
        paymentStatus: TPlanType.BEGINNER,
        expiredAt: team.subscriptions[0]?.expiredDate ?? 0,
      };
    })
    .filter((team): team is NonNullable<typeof team> => team !== null);

  // Info: (20250410 - tzuhan) 統一觸發 session 同步
  if (syncSession) {
    await Promise.all(updatedSessionPromises);
  }

  return toPaginatedData({
    data: teamData,
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });
};

export const createTeamWithTrial = async (
  userId: number,
  teamData: {
    name: string;
    members?: string[];
    planType?: TPlanType;
    about?: string;
    profile?: string;
    bankInfo?: { code: number; number: string };
    imageFileId?: number;
  }
): Promise<ITeam> => {
  return prisma.$transaction(async (tx) => {
    // Info: (20250409 - Tzuhan) 1. 限制團隊數量
    const teamCount = await tx.team.count({
      where: { ownerId: userId },
    });
    if (teamCount >= MAX_TEAM_LIMIT) {
      throw new Error('USER_TEAM_LIMIT_REACHED');
    }

    loggerBack.info(
      `User ${userId} is creating a new team (teamData: ${JSON.stringify(teamData)}) with trial subscription.`
    );

    const plan = await tx.teamPlan.findFirst({
      where: {
        type: teamData.planType === TPlanType.BEGINNER ? TPlanType.PROFESSIONAL : teamData.planType,
      },
      select: { type: true },
    });
    if (!plan) throw new Error('PLAN_NOT_FOUND');

    loggerBack.info(`User ${userId} is creating a new team plan: ${plan.type}`);

    const now = new Date();
    const nowInSeconds = getUnixTime(now);

    // Info: (20250409 - Tzuhan) 2. 建立團隊
    const newTeam = await tx.team.create({
      data: {
        ownerId: userId,
        name: teamData.name,
        imageFileId: teamData.imageFileId ?? null,
        about: teamData.about ?? '',
        profile: teamData.profile ?? '',
        bankInfo: teamData.bankInfo ?? { code: '', number: '' },
      },
      include: {
        members: true,
        accountBook: true,
        imageFile: true,
      },
    });

    // Info: (20250409 - Tzuhan) 3. 新增 owner 為成員
    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: TeamRole.OWNER,
        joinedAt: nowInSeconds,
      },
    });

    // Info: (20250409 - Tzuhan) 4. 處理邀請成員
    if (teamData.members?.length) {
      const existingUsers = await tx.user.findMany({
        where: { email: { in: teamData.members } },
        select: { id: true, email: true },
      });

      const existingUserEmails = new Set(existingUsers.map((u) => u.email));
      const newUserEmails = teamData.members.filter((email) => !existingUserEmails.has(email));

      if (existingUsers.length) {
        await tx.teamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId: newTeam.id,
            userId: user.id,
            role: TeamRole.EDITOR,
            joinedAt: nowInSeconds,
          })),
          skipDuplicates: true,
        });

        await tx.inviteTeamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId: newTeam.id,
            email: user.email!,
            status: InviteStatus.COMPLETED,
            createdAt: nowInSeconds,
            completedAt: nowInSeconds,
            note: JSON.stringify({
              reason: 'User already exists, added to team without asking',
            }),
          })),
          skipDuplicates: true,
        });
      }

      if (newUserEmails.length) {
        await tx.inviteTeamMember.createMany({
          data: newUserEmails.map((email) => ({
            teamId: newTeam.id,
            email,
            status: InviteStatus.PENDING,
            createdAt: nowInSeconds,
            note: JSON.stringify({
              reason:
                'User not exists, pending for join, when user register, will be added to team',
            }),
          })),
          skipDuplicates: true,
        });
      }
    }

    // Info: (20250409 - Tzuhan) 5. 建立試用 TeamSubscription（預設為 PROFESSIONAL 方案）
    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planType: plan.type,
        startDate: nowInSeconds,
        expiredDate: getUnixTime(addMonths(now, 1)),
      },
    });

    // Info: (20250409 - Tzuhan) 6. 回傳 ITeam 格式
    return {
      id: newTeam.id,
      imageId: newTeam.imageFile?.url ?? '/images/fake_team_img.svg',
      role: TeamRole.OWNER,
      name: { value: newTeam.name, editable: true },
      about: { value: newTeam.about ?? '', editable: true },
      profile: { value: newTeam.profile ?? '', editable: true },
      planType: { value: plan.type as TPlanType, editable: false },
      totalMembers: newTeam.members.length + 1,
      totalAccountBooks: newTeam.accountBook.length,
      bankAccount: {
        value: newTeam.bankInfo
          ? `${(newTeam.bankInfo as { code: string }).code}-${(newTeam.bankInfo as { number: string }).number}`
          : '',
        editable: true,
      },
      expiredAt: getUnixTime(addMonths(now, 1)),
    };
  });
};

export const createTeam = async (
  userId: number,
  teamData: {
    name: string;
    members?: string[];
    planType?: TPlanType;
    about?: string;
    profile?: string;
    bankInfo?: { code: number; number: string };
    imageFileId?: number;
  }
): Promise<ITeam> => {
  // Info: (20250321 - Tzuhan) 1️. 檢查該用戶已擁有的團隊數量
  return prisma.$transaction(async (tx) => {
    const teamCount = await tx.team.count({
      where: { ownerId: userId },
    });

    if (teamCount >= MAX_TEAM_LIMIT) {
      throw new Error('USER_TEAM_LIMIT_REACHED'); // Info: (20250321 - Tzuhan) 超過 3 個團隊，阻止創建
    }

    // Info: (20250304 - Tzuhan) 2. 取得 `planId`
    const plan = await tx.teamPlan.findFirst({
      where: { type: teamData.planType ?? TPlanType.BEGINNER },
      select: { id: true },
    });

    if (!plan) {
      throw new Error('Plan type not found');
    }

    const now = Math.floor(Date.now() / 1000);

    // Info: (20250304 - Tzuhan) 3. 創建團隊
    const newTeam = await tx.team.create({
      data: {
        ownerId: userId,
        name: teamData.name,
        imageFileId: teamData.imageFileId ?? null,
        about: teamData.about ?? '',
        profile: teamData.profile ?? '',
        bankInfo: teamData.bankInfo ?? { code: '', number: '' },
      },
      include: {
        members: true,
        accountBook: true,
        imageFile: true,
      },
    });

    // Info: (20250305 - Tzuhan) 4. 將創建者加入 `teamMember`
    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: TeamRole.OWNER,
        joinedAt: now,
      },
    });

    // Info: (20250304 - Tzuhan) 5. 遍歷 `members`，判斷 Email 是否存在於 `User`
    if (teamData.members && teamData.members.length > 0) {
      const existingUsers = await tx.user.findMany({
        where: { email: { in: teamData.members } },
        select: { id: true, email: true },
      });

      const existingUserEmails = new Set(existingUsers.map((user) => user.email));
      const newUserEmails = teamData.members.filter((email) => !existingUserEmails.has(email));

      // Info: (20250304 - Tzuhan) 5.1 批量插入 `teamMember`
      if (existingUsers.length > 0) {
        await tx.teamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId: newTeam.id,
            userId: user.id,
            role: TeamRole.EDITOR,
            joinedAt: now,
          })),
          skipDuplicates: true,
        });

        // Info: (20250317 - Tzuhan) 記錄成功加入的用戶
        await tx.inviteTeamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId: newTeam.id,
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

      // Info: (20250304 - Tzuhan) 5.2 批量插入 `pendingTeamMember`
      if (newUserEmails.length > 0) {
        await tx.inviteTeamMember.createMany({
          data: newUserEmails.map((email) => ({
            teamId: newTeam.id,
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
    }

    // ToDo: (20250304 - Tzuhan) 6. 創建試用期 `TeamSubscription`

    return {
      id: newTeam.id,
      imageId: newTeam.imageFile?.url ?? '/images/fake_team_img.svg',
      role: TeamRole.OWNER,
      name: { value: newTeam.name, editable: true },
      about: { value: newTeam.about ?? '', editable: true },
      profile: { value: newTeam.profile ?? '', editable: true },
      planType: { value: teamData.planType ?? TPlanType.BEGINNER, editable: false },
      totalMembers: newTeam.members.length + 1,
      totalAccountBooks: newTeam.accountBook.length,
      bankAccount: {
        value: newTeam.bankInfo
          ? `${(newTeam.bankInfo as { code: string }).code}-${(newTeam.bankInfo as { number: string }).number}`
          : '',
        editable: true,
      },
      expiredAt: 0,
    };
  });
};

export async function assertUserIsTeamMember(
  userId: number,
  teamId: number
): Promise<{
  actualRole: TeamRole;
  effectiveRole: TeamRole;
  expiredAt?: number;
}> {
  const nowInSecond = Math.floor(Date.now() / 1000);

  const member = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      role: true,
      team: {
        select: {
          subscriptions: {
            where: {
              startDate: {
                lte: nowInSecond,
              },
              expiredDate: {
                gt: nowInSecond,
              },
            },
            select: {
              expiredDate: true,
            },
          },
        },
      },
    },
  });

  if (!member) throw new Error('USER_NOT_IN_TEAM');

  const { role, team } = member;

  const expiredAt = team.subscriptions[0]?.expiredDate ?? 0;
  const isExpired = expiredAt === 0;

  return {
    actualRole: role as TeamRole,
    effectiveRole: isExpired ? TeamRole.VIEWER : (role as TeamRole),
    expiredAt,
  };
}

export const getTeamByTeamId = async (teamId: number, userId: number): Promise<ITeam | null> => {
  // Info: (20250410 - tzuhan) Step 1. 驗證是否為團隊成員並取得角色
  const role = await assertUserIsTeamMember(userId, teamId);

  // Info: (20250410 - tzuhan) Step 2. 確保 session 中有正確的 teamRole
  await updateTeamMemberSession(userId, teamId, role.effectiveRole);

  // Info: (20250410 - tzuhan) Step 3. 查詢團隊資訊
  const nowInSecond = getTimestampNow();

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { status: LeaveStatus.IN_TEAM },
        select: {
          userId: true,
          role: true,
          user: {
            select: { name: true, email: true, imageFileId: true },
          },
        },
      },
      accountBook: {
        select: { id: true },
      },
      subscriptions: {
        where: {
          startDate: {
            lte: nowInSecond,
          },
          expiredDate: {
            gt: nowInSecond,
          },
        },
        include: { plan: true },
      },
      imageFile: {
        select: { id: true, url: true },
      },
    },
  });

  if (!team) {
    throw new Error('TEAM_NOT_FOUND');
  }

  const teamRole =
    (team.members.find((member) => member.userId === userId)?.role as TeamRole) ?? TeamRole.VIEWER;
  const planType = team.subscriptions[0]
    ? (team.subscriptions[0].plan.type as TPlanType)
    : TPlanType.BEGINNER;

  return {
    id: team.id,
    imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
    role: teamRole,
    name: {
      value: team.name,
      editable: teamRole !== TeamRole.VIEWER,
    },
    about: {
      value: team.about || '',
      editable: teamRole !== TeamRole.VIEWER,
    },
    profile: {
      value: team.profile || '',
      editable: teamRole !== TeamRole.VIEWER,
    },
    planType: {
      value: planType,
      editable: false,
    },
    totalMembers: team.members.length,
    totalAccountBooks: team.accountBook.length,
    bankAccount: {
      value: team.bankInfo
        ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
        : '',
      editable: teamRole !== TeamRole.VIEWER,
    },
    expiredAt: team.subscriptions[0]?.expiredDate ?? 0,
  };
};

export async function createDefaultTeamForUser(userId: number, userName: string) {
  const teamName = `${userName}'s Team`;

  const team = await createTeam(userId, {
    name: teamName,
  });

  return team;
}

export const countTeamMembersById = async (teamId: number): Promise<number> => {
  const teamMembersCount = prisma.teamMember.count({
    where: { teamId, leftAt: null },
  });
  return teamMembersCount;
};

/**
 * Info: (20250324 - Shirley) Similar to putCompanyIcon, this function connects a file to a team
 * Updates the team's icon with the provided file ID
 * @param options Object containing teamId and fileId
 * @returns The updated team with the image file included
 */
export async function putTeamIcon(options: { teamId: number; fileId: number }) {
  const now = Math.floor(Date.now() / 1000);
  const { teamId, fileId } = options;

  const updatedTeam = await prisma.team.update({
    where: {
      id: teamId,
    },
    data: {
      imageFile: {
        connect: {
          id: fileId,
        },
      },
      updatedAt: now,
    },
    include: {
      imageFile: true,
    },
  });

  return updatedTeam;
}

/**
 * Info: (20250324 - Shirley) This function is called during file upload to update team's icon
 * Updates the team's icon in the file upload process
 * @param teamId The ID of the team to update
 * @param fileId The ID of the uploaded file
 * @returns The updated team
 */
export async function updateTeamIcon(teamId: number, fileId: number) {
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { imageFileId: fileId },
  });
  return team;
}

/**
 * Info: (20250324 - Shirley) 根據用戶 ID 和團隊 ID 列表獲取多個團隊信息
 * @param userId 用戶 ID
 * @param teamIds 團隊 ID 列表
 * @returns 團隊信息列表
 */
export const getTeamsByUserIdAndTeamIds = async (
  userId: number,
  teamIds: number[]
): Promise<ITeam[]> => {
  if (!teamIds.length) return [];

  // Info: (20250324 - Shirley) 獲取用戶在指定團隊中的成員資格
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      userId,
      teamId: { in: teamIds },
      status: LeaveStatus.IN_TEAM,
    },
  });

  // Info: (20250324 - Shirley) 如果用戶不是任何團隊的成員，返回空數組
  if (!teamMembers.length) return [];

  // Info: (20250324 - Shirley) 創建團隊 ID 到成員角色的映射
  const teamMemberRoleMap = new Map(teamMembers.map((member) => [member.teamId, member.role]));

  // Info: (20250324 - Shirley) 只獲取用戶是成員的團隊
  const validTeamIds = teamMembers.map((member) => member.teamId);

  // Info: (20250324 - Shirley) 查詢這些團隊的詳細信息
  const teams = await prisma.team.findMany({
    where: { id: { in: validTeamIds } },
    include: {
      members: {
        where: { status: LeaveStatus.IN_TEAM },
        select: {
          userId: true,
          role: true,
          user: {
            select: { name: true, email: true, imageFileId: true },
          },
        },
      },
      accountBook: true,
      subscriptions: {
        where: {
          startDate: { lte: getTimestampNow() },
          expiredDate: { gt: getTimestampNow() },
        },
        include: { plan: true },
      },
      imageFile: { select: { id: true, url: true } },
    },
  });

  // Info: (20250324 - Shirley) 轉換為 ITeam 格式
  return teams.map((team) => {
    const teamRole = (teamMemberRoleMap.get(team.id) as TeamRole) || TeamRole.VIEWER;

    return {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: teamRole,
      name: { value: team.name, editable: teamRole !== TeamRole.VIEWER },
      about: { value: team.about || '', editable: teamRole !== TeamRole.VIEWER },
      profile: { value: team.profile || '', editable: teamRole !== TeamRole.VIEWER },
      planType: {
        value: (team.subscriptions[0]?.plan.type as TPlanType) ?? TPlanType.BEGINNER,
        editable: false,
      },
      totalMembers: team.members.length,
      totalAccountBooks: team.accountBook.length,
      bankAccount: {
        value: team.bankInfo
          ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
          : '',
        editable: teamRole !== TeamRole.VIEWER,
      },
      // ToDo: (20250330 - Luphia) 需從團隊訂閱狀態取得資料
      paymentStatus: TPlanType.BEGINNER,
      expiredAt: team.subscriptions[0]?.expiredDate ?? 0,
    };
  });
};

/**
 * Info: (20250325 - Shirley) 更新團隊信息
 * @param teamId 團隊 ID
 * @param updateData 更新的團隊數據
 * @returns 更新後的團隊信息
 */
export const updateTeamById = async (
  teamId: number,
  updateData: {
    name?: string;
    about?: string;
    profile?: string;
    bankInfo?: { code: string; account: string };
  }
): Promise<{
  id: number;
  name: string;
  about: string;
  profile: string;
  bankInfo: { code: string; account: string } | null;
} | null> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    throw new Error('TEAM_NOT_FOUND');
  }

  // Info: (20250325 - Shirley) 將 bankInfo 轉換為資料庫格式
  const bankInfoDb = updateData.bankInfo
    ? {
        code: updateData.bankInfo.code,
        number: updateData.bankInfo.account,
      }
    : undefined;

  // Info: (20250325 - Shirley) 更新團隊數據
  const updatedTeam = await prisma.team.update({
    where: { id: teamId },
    data: {
      name: updateData.name ?? undefined,
      about: updateData.about ?? undefined,
      profile: updateData.profile ?? undefined,
      bankInfo: bankInfoDb,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });

  // Info: (20250325 - Shirley) 轉換回應格式
  return {
    id: updatedTeam.id,
    name: updatedTeam.name,
    about: updatedTeam.about || '',
    profile: updatedTeam.profile || '',
    bankInfo: updatedTeam.bankInfo
      ? {
          code: (updatedTeam.bankInfo as { code: string }).code,
          account: (updatedTeam.bankInfo as { number: string }).number,
        }
      : null,
  };
};
