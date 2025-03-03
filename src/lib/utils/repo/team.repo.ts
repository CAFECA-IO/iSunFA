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
      id: team.id.toString(),
      imageId: team.profile,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getTeamById = async (teamId: string, userId: number): Promise<ITeam | null> => {
  return null;
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
  }
): Promise<ITeam> => {
  // Info: (20250303 - Tzuhan) 取得對應的 planId，若未提供，則使用預設方案 (BEGINNER)
  const plan = await prisma.teamPlan.findFirst({
    where: { type: teamData.planType ?? TPlanType.BEGINNER },
    select: { id: true },
  });

  if (!plan) {
    throw new Error('Plan type not found');
  }

  const now = Math.floor(Date.now() / 1000); // Info: (20250303 - Tzuhan) 以秒為單位的 UNIX timestamp

  // Info: (20250303 - Tzuhan) 建立團隊
  const newTeam = await prisma.team.create({
    data: {
      ownerId: userId,
      name: teamData.name,
      createdAt: now,
    },
    include: {
      members: true,
      ledger: true,
    },
  });

  // Info: (20250303 - Tzuhan) 建立團隊訂閱
  await prisma.teamSubscription.create({
    data: {
      teamId: newTeam.id,
      planId: plan.id,
      autoRenewal: false,
      startDate: now, // Info: (20250303 - Tzuhan) ✅ 以當前時間作為開始日期
      expiredDate: now + 30 * 24 * 60 * 60, // Info: (20250303 - Tzuhan) 預設 30 天後過期
      paymentStatus: TeamPaymentStatus.FREE,
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    id: newTeam.id.toString(),
    imageId: newTeam.profile ?? '/images/fake_team_img.svg',
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
};
