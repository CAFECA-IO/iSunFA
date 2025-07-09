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
import { MAX_TEAM_LIMIT, TeamPermissionAction } from '@/interfaces/permissions';
import { getTimestampNow } from '@/lib/utils/common';
import { listTeamQuerySchema } from '@/lib/utils/zod_schema/team';
import loggerBack from '@/lib/utils/logger_back';
import { updateTeamMemberSession } from '@/lib/utils/session';
import {
  assertUserCan,
  assertUserIsTeamMember,
} from '@/lib/utils/permission/assert_user_team_permission';
import { getGracePeriodInfo } from '@/lib/shared/permission';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { checkTeamMemberLimit } from '@/lib/utils/plan/check_plan_limit';

function buildTeamListWhere({
  teamIds,
  startDate,
  endDate,
  searchQuery,
}: {
  teamIds: number[];
  startDate?: number;
  endDate?: number;
  searchQuery?: string;
}) {
  const where: { [key: string]: object } = {
    id: { in: teamIds },
  };

  if (startDate && endDate) {
    where.createdAt = { gte: startDate, lte: endDate };
  }

  if (searchQuery?.trim()) {
    where.name = { contains: searchQuery.trim(), mode: 'insensitive' };
  }

  return where;
}

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
  const userTeamMemberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true, status: true },
  });

  const inTeamIds = userTeamMemberships
    .filter((m) => m.status === LeaveStatus.IN_TEAM)
    .map((m) => m.teamId);

  const where = buildTeamListWhere({ teamIds: inTeamIds, startDate, endDate, searchQuery });

  const [totalCount, teams] = await prisma.$transaction([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      include: {
        members: { where: { userId }, select: { id: true, role: true } },
        accountBook: true,
        imageFile: { select: { id: true, url: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption),
    }),
  ]);

  const updatedSessionPromises: Promise<void>[] = [];

  const teamData = await Promise.all(
    teams.map(async (team) => {
      const { actualRole, effectiveRole, expiredAt, inGracePeriod, gracePeriodEndAt, planType } =
        await assertUserIsTeamMember(userId, team.id);

      if (syncSession) {
        updatedSessionPromises.push(updateTeamMemberSession(userId, team.id, effectiveRole));
      }

      const { can } = await assertUserCan({
        userId,
        teamId: team.id,
        action: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
      });

      if (canCreateAccountBookOnly && !can) return null;

      return {
        id: team.id,
        imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
        role: actualRole,
        name: { value: team.name, editable: effectiveRole !== TeamRole.VIEWER },
        about: { value: team.about || '', editable: effectiveRole !== TeamRole.VIEWER },
        profile: { value: team.profile || '', editable: effectiveRole !== TeamRole.VIEWER },
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
          editable: effectiveRole !== TeamRole.VIEWER,
        },
        expiredAt,
        inGracePeriod,
        gracePeriodEndAt,
      };
    })
  );

  if (syncSession) {
    await Promise.all(updatedSessionPromises);
  }

  return toPaginatedData({
    data: teamData.filter((team): team is NonNullable<typeof team> => team !== null),
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
    loggerBack.info(
      `User ${userId} is creating a new team (teamData: ${JSON.stringify(teamData)}) with 1-month TRIAL subscription.`
    );

    const now = new Date();
    const nowInSeconds = getUnixTime(now);
    const trialEndDate = addMonths(now, 1); // Info: (20250708 - Shirley) Always 1 month trial for new teams
    const expired = getUnixTime(trialEndDate);
    const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expired);
    // Info: (20250708 - Shirley) All new teams start with TRIAL plan for 1 month
    const plan = await tx.teamPlan.findFirst({
      where: {
        type:
          teamData.planType === TPlanType.BEGINNER || !teamData.planType
            ? TPlanType.TRIAL
            : teamData.planType,
      },
      select: { type: true },
    });
    if (!plan) {
      const error = new Error(STATUS_MESSAGE.PLAN_NOT_FOUND);
      error.name = STATUS_CODE.PLAN_NOT_FOUND;
      throw error;
    }

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

      const userEmailMap = [
        ...existingUsers.map((user) => ({
          userId: user.id,
          email: user.email!,
        })),
        ...newUserEmails.map((email) => ({
          userId: undefined,
          email,
        })),
      ];

      await tx.inviteTeamMember.createMany({
        data: userEmailMap.map(({ email }) => ({
          teamId: newTeam.id,
          email,
          status: InviteStatus.PENDING,
          createdAt: nowInSeconds,
          note: JSON.stringify({
            reason: existingUserEmails.has(email)
              ? 'User exists, waiting for accept'
              : 'User not exists, pending for join, when user register, will be added to team',
          }),
        })),
      });

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

    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planType: plan.type,
        startDate: nowInSeconds,
        expiredDate: expired,
      },
    });

    // Info: (20250708 - Shirley) Check team member limit after subscription is created
    await checkTeamMemberLimit(newTeam.id, teamData.members?.length ?? 0, tx);

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
      expiredAt: expired,
      inGracePeriod,
      gracePeriodEndAt,
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
    const teamCount = await tx.team.count({ where: { ownerId: userId } });
    if (teamCount >= MAX_TEAM_LIMIT) {
      const error = new Error(STATUS_MESSAGE.USER_TEAM_LIMIT_REACHED);
      error.name = STATUS_CODE.USER_TEAM_LIMIT_REACHED;
      throw error;
    }

    const now = new Date();
    const nowInSecond = getUnixTime(now);
    const expired = getUnixTime(addMonths(now, 1));
    const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expired);

    // Info: (20250304 - Tzuhan) 2. 取得 `planId`
    const plan = await tx.teamPlan.findFirst({
      where: { type: teamData.planType ?? TPlanType.BEGINNER },
      select: { id: true, type: true },
    });
    if (!plan) {
      const error = new Error(STATUS_MESSAGE.PLAN_NOT_FOUND);
      error.name = STATUS_CODE.PLAN_NOT_FOUND;
      throw error;
    }

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

    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: TeamRole.OWNER,
        joinedAt: nowInSecond,
      },
    });

    await checkTeamMemberLimit(newTeam.id, teamData.members?.length ?? 0);

    // Info: (20250304 - Tzuhan) 5. 遍歷 `members`，判斷 Email 是否存在於 `User`
    if (teamData.members?.length) {
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
            joinedAt: nowInSecond,
          })),
          skipDuplicates: true,
        });

        // Info: (20250317 - Tzuhan) 記錄成功加入的用戶
        await tx.inviteTeamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId: newTeam.id,
            email: user.email!,
            status: InviteStatus.COMPLETED,
            createdAt: nowInSecond,
            completedAt: nowInSecond,
            note: JSON.stringify({ reason: 'User already exists, added to team without asking' }),
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
            createdAt: nowInSecond,
            note: JSON.stringify({
              reason:
                'User not exists, pending for join, when user register, will be added to team',
            }),
          })),
          skipDuplicates: true,
        });
      }
    }

    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planType: plan.type,
        startDate: nowInSecond,
        expiredDate: expired,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    });

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
      expiredAt: expired,
      inGracePeriod,
      gracePeriodEndAt,
    };
  });
};

export const getTeamByTeamId = async (teamId: number, userId: number): Promise<ITeam | null> => {
  // Info: (20250410 - tzuhan) Step 1: 驗證是否為團隊成員並取得角色、訂閱資訊
  const { effectiveRole, expiredAt, inGracePeriod, gracePeriodEndAt } =
    await assertUserIsTeamMember(userId, teamId);

  // Info: (20250410 - tzuhan) Step 2: 同步 session 中的 teamRole
  await updateTeamMemberSession(userId, teamId, effectiveRole);

  // Info: (20250410 - tzuhan) Step 3: 查詢團隊資訊
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
    const error = new Error(STATUS_MESSAGE.TEAM_NOT_FOUND);
    error.name = STATUS_CODE.TEAM_NOT_FOUND;
    throw error;
  }

  const planType = team.subscriptions[0]?.plan?.type ?? TPlanType.BEGINNER;

  return {
    id: team.id,
    imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
    role: effectiveRole,
    name: {
      value: team.name,
      editable: effectiveRole !== TeamRole.VIEWER,
    },
    about: {
      value: team.about || '',
      editable: effectiveRole !== TeamRole.VIEWER,
    },
    profile: {
      value: team.profile || '',
      editable: effectiveRole !== TeamRole.VIEWER,
    },
    planType: {
      value: planType as TPlanType,
      editable: false,
    },
    totalMembers: team.members.length,
    totalAccountBooks: team.accountBook.length,
    bankAccount: {
      value: team.bankInfo
        ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
        : '',
      editable: effectiveRole !== TeamRole.VIEWER,
    },
    expiredAt: expiredAt ?? 0,
    inGracePeriod,
    gracePeriodEndAt,
  };
};

export async function createDefaultTeamForUser(userId: number, userName: string) {
  const teamName = `${userName}'s Team`;

  const team = await createTeamWithTrial(userId, {
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

  const nowInSecond = getTimestampNow();
  const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60;

  // Info: (20250410 - tzuhan) 查詢使用者在這些團隊的有效成員角色與訂閱狀態
  const teamMembers = await prisma.teamMember.findMany({
    where: {
      userId,
      teamId: { in: teamIds },
      status: LeaveStatus.IN_TEAM,
    },
    select: {
      teamId: true,
      role: true,
      team: {
        select: {
          subscriptions: {
            where: {
              startDate: { lte: nowInSecond },
              expiredDate: { gt: nowInSecond - THREE_DAYS_IN_SECONDS },
            },
            select: {
              expiredDate: true,
              startDate: true,
              plan: {
                select: { type: true },
              },
            },
            orderBy: { expiredDate: SortOrder.DESC },
            take: 1,
          },
        },
      },
    },
  });

  if (!teamMembers.length) return [];

  const roleMap = new Map<
    number,
    {
      actualRole: TeamRole;
      effectiveRole: TeamRole;
      expiredAt: number;
      inGracePeriod: boolean;
      gracePeriodEndAt: number;
      planType: TPlanType;
    }
  >();

  teamMembers.forEach((member) => {
    const actualRole = member.role as TeamRole;
    const subscription = member.team.subscriptions[0];
    const expiredAt = subscription?.expiredDate ?? 0;
    const planType = (member.team.subscriptions[0]?.plan?.type as TPlanType) ?? TPlanType.BEGINNER;

    const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);
    const isExpired = expiredAt === 0 || nowInSecond > gracePeriodEndAt;
    const effectiveRole = isExpired ? TeamRole.VIEWER : actualRole;

    roleMap.set(member.teamId, {
      actualRole,
      effectiveRole,
      expiredAt,
      inGracePeriod,
      gracePeriodEndAt,
      planType,
    });
  });

  const validTeamIds = Array.from(roleMap.keys());

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
      imageFile: { select: { id: true, url: true } },
    },
  });

  return teams.map((team) => {
    const meta = roleMap.get(team.id)!;

    return {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: meta.effectiveRole,
      name: { value: team.name, editable: meta.effectiveRole !== TeamRole.VIEWER },
      about: { value: team.about || '', editable: meta.effectiveRole !== TeamRole.VIEWER },
      profile: { value: team.profile || '', editable: meta.effectiveRole !== TeamRole.VIEWER },
      planType: {
        value: meta.planType,
        editable: false,
      },
      totalMembers: team.members.length,
      totalAccountBooks: team.accountBook.length,
      bankAccount: {
        value: team.bankInfo
          ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
          : '',
        editable: meta.effectiveRole !== TeamRole.VIEWER,
      },
      expiredAt: meta.expiredAt,
      inGracePeriod: meta.inGracePeriod,
      gracePeriodEndAt: meta.gracePeriodEndAt,
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
    const error = new Error(STATUS_MESSAGE.TEAM_NOT_FOUND);
    error.name = STATUS_CODE.TEAM_NOT_FOUND;
    throw error;
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
