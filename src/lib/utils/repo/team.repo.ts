import prisma from '@/client';
import { ITeam, TeamRole } from '@/interfaces/team';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { TeamPaymentStatus } from '@prisma/client';
import { DEFAULT_END_DATE } from '@/constants/config';

const createOrderByList = (sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) => {
  const orderBy: { [key: string]: SortOrder }[] = [];
  sortOptions.forEach((sort) => {
    const { sortBy, sortOrder } = sort;
    switch (sortBy) {
      case SortBy.CREATED_AT:
      case SortBy.DATE:
        orderBy.push({
          createdAt: sortOrder,
        });
        break;
      default:
        orderBy.push({
          createdAt: SortOrder.DESC,
        });
        break;
    }
  });
  return orderBy;
};

export const getTeamList = async (
  userId: number,
  queryParams: z.infer<typeof paginatedDataQuerySchema> = {}
): Promise<IPaginatedOptions<ITeam[]>> => {
  const {
    page = 1, // Info: (20250227 - tzuhan) 提供預設值
    pageSize = 1,
    startDate = 0,
    endDate = DEFAULT_END_DATE,
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
    searchQuery = '',
  } = queryParams;

  const totalCount = await prisma.team.count({
    where: {
      members: {
        some: { userId }, // Info: (20250227 - tzuhan) 只查詢用戶所屬的團隊
      },
      createdAt: { gte: startDate, lte: endDate },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
    },
  });

  const totalPages = Math.ceil(totalCount / (pageSize || 1));

  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: { userId },
      },
      createdAt: { gte: startDate, lte: endDate },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
    },
    include: {
      members: {
        where: { userId }, // Info: (20250227 - tzuhan) 取得當前使用者的角色
        select: { role: true },
      },
      ledger: true, // Info: (20250227 - tzuhan) 帳本數
      subscription: {
        include: { plan: true }, // Info: (20250227 - tzuhan) 訂閱方案
      },
      imageFile: true,
    },
    skip: ((page || 1) - 1) * (pageSize || 1),
    take: pageSize,
    orderBy: createOrderByList(sortOption), // Info: (20250227 - tzuhan) 預設排序方式
  });

  const teamData: ITeam[] = teams.map((team) => {
    const userRole = (team.members[0]?.role as TeamRole) || TeamRole.VIEWER; // Info: (20250227 - tzuhan) 預設為 VIEWER
    const planType = team.subscription
      ? (team.subscription.plan.type as TPlanType)
      : TPlanType.BEGINNER; // Info: (20250227 - tzuhan) 預設 Beginner 計畫
    const paymentStatus = team.subscription
      ? team.subscription.paymentStatus
      : TeamPaymentStatus.FREE;

    return {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: userRole,
      name: {
        value: team.name,
        editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
      },
      about: {
        value: team.about || '',
        editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
      },
      profile: {
        value: team.profile || '',
        editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
      },
      planType: {
        value: planType,
        editable: false,
      },
      totalMembers: team.members.length,
      totalAccountBooks: team.ledger.length,
      bankAccount: {
        value: team.bankInfo
          ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
          : '',
        editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
      },
      paymentStatus,
    };
  });

  return {
    data: teamData,
    page,
    totalPages,
    totalCount,
    pageSize,
    sort: sortOption,
  };
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
  return prisma.$transaction(async (tx) => {
    // Info: (20250304 - Tzuhan) 1️. 取得 `planId`
    const plan = await tx.teamPlan.findFirst({
      where: { type: teamData.planType ?? TPlanType.BEGINNER },
      select: { id: true },
    });

    if (!plan) {
      throw new Error('Plan type not found');
    }

    const now = Math.floor(Date.now() / 1000);

    // Info: (20250304 - Tzuhan) 2️. 創建團隊
    const newTeam = await tx.team.create({
      data: {
        ownerId: userId,
        name: teamData.name,
        imageFileId: teamData.imageFileId ?? null,
        createdAt: now,
      },
      include: {
        members: true,
        ledger: true,
        imageFile: true,
      },
    });

    // Info: (20250304 - Tzuhan) 3️. 遍歷 `members`，判斷 Email 是否存在於 `User`
    if (teamData.members && teamData.members.length > 0) {
      const existingUsers = await tx.user.findMany({
        where: { email: { in: teamData.members } },
        select: { id: true, email: true },
      });

      const existingUserEmails = new Set(existingUsers.map((user) => user.email));

      const newTeamMembers = existingUsers.map((user) => ({
        teamId: newTeam.id,
        userId: user.id,
        role: TeamRole.EDITOR,
        joinedAt: now,
      }));

      if (newTeamMembers.length > 0) {
        await tx.teamMember.createMany({ data: newTeamMembers });
      }

      // Info: (20250304 - Tzuhan) 4️. 將不存在的 Email 新增到 `PendingTeamMember`
      const pendingMembers = teamData.members
        .filter((email) => !existingUserEmails.has(email))
        .map((email) => ({
          teamId: newTeam.id,
          email,
          createdAt: now,
        }));

      if (pendingMembers.length > 0) {
        await tx.pendingTeamMember.createMany({ data: pendingMembers });
      }
    }

    // Info: (20250304 - Tzuhan) 5️. 創建 `TeamSubscription`
    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planId: plan.id,
        autoRenewal: false,
        startDate: now,
        expiredDate: now + 30 * 24 * 60 * 60,
        paymentStatus: TeamPaymentStatus.FREE,
        createdAt: now,
        updatedAt: now,
      },
    });

    return {
      id: newTeam.id,
      imageId: newTeam.imageFile?.url ?? '/images/fake_team_img.svg',
      role: TeamRole.OWNER,
      name: {
        value: newTeam.name,
        editable: true,
      },
      about: {
        value: newTeam.about ?? '',
        editable: true,
      },
      profile: {
        value: newTeam.profile ?? '',
        editable: true,
      },
      planType: {
        value: teamData.planType ?? TPlanType.BEGINNER,
        editable: false,
      },
      totalMembers: newTeam.members.length,
      totalAccountBooks: newTeam.ledger.length,
      bankAccount: {
        value: newTeam.bankInfo
          ? `${(newTeam.bankInfo as { code: string }).code}-${(newTeam.bankInfo as { number: string }).number}`
          : '',
        editable: true,
      },
    };
  });
};

export const getTeamByTeamId = async (teamId: number, userId: number): Promise<ITeam | null> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
          user: {
            select: { name: true, email: true, imageFileId: true },
          },
        },
      },
      ledger: {
        select: { id: true },
      },
      subscription: {
        include: { plan: true },
      },
      imageFile: {
        select: { id: true, url: true },
      },
    },
  });

  if (!team) {
    return null;
  }

  const userRole =
    (team.members.find((member) => member.userId === userId)?.role as TeamRole) ?? TeamRole.VIEWER;
  const planType = team.subscription
    ? (team.subscription.plan.type as TPlanType)
    : TPlanType.BEGINNER;

  return {
    id: team.id,
    imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
    role: userRole,
    name: {
      value: team.name,
      editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
    },
    about: {
      value: team.about || '',
      editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
    },
    profile: {
      value: team.profile || '',
      editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
    },
    planType: {
      value: planType,
      editable: false,
    },
    totalMembers: team.members.length,
    totalAccountBooks: team.ledger.length,
    bankAccount: {
      value: team.bankInfo
        ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
        : '',
      editable: userRole === TeamRole.OWNER || userRole === TeamRole.ADMIN,
    },
  };
};

export const addMembersToTeam = async (
  teamId: number,
  emails: string[]
): Promise<{ invitedCount: number; failedEmails: string[] }> => {
  const now = Math.floor(Date.now() / 1000);
  const failedEmails: string[] = [];
  let invitedCount = 0;

  // Info: (20250304 - Tzuhan) 取得所有現有的用戶
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const existingUserEmails = existingUsers.map((user) => user.email);
  const newUserEmails = emails.filter((email) => !existingUserEmails.includes(email));

  // Info: (20250304 - Tzuhan) 批量新增現有用戶至 team_member
  const existingUsersPromises = existingUsers.map((user) =>
    prisma.teamMember
      .create({
        data: {
          teamId,
          userId: user.id,
          role: TeamRole.EDITOR, // Info: (20250304 - Tzuhan) 預設角色為 EDITOR
          joinedAt: now,
        },
      })
      .then(() => {
        invitedCount += 1;
      })
      .catch(() => failedEmails.push(user.email!))
  );

  // Info: (20250304 - Tzuhan) 批量新增未註冊用戶至 pending_team_member
  const newUserPromises = newUserEmails.map((email) =>
    prisma.pendingTeamMember
      .create({
        data: {
          teamId,
          email,
          createdAt: now,
        },
      })
      .then(() => {
        invitedCount += 1;
      })
      .catch(() => failedEmails.push(email))
  );

  // Info: (20250304 - Tzuhan) 並行執行所有 DB 操作
  await Promise.all([...existingUsersPromises, ...newUserPromises]);

  return { invitedCount, failedEmails };
};
