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
  return sortOptions.map(({ sortBy, sortOrder }) => ({
    createdAt: sortBy === SortBy.CREATED_AT || sortBy === SortBy.DATE ? sortOrder : SortOrder.DESC,
  }));
};

export const getTeamList = async (
  userId: number,
  queryParams: z.infer<typeof paginatedDataQuerySchema> = {}
): Promise<IPaginatedOptions<ITeam[]>> => {
  const {
    page = 1,
    pageSize = 1,
    startDate = 0,
    endDate = DEFAULT_END_DATE,
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
    searchQuery = '',
  } = queryParams;

  const [totalCount, teams] = await prisma.$transaction([
    prisma.team.count({
      where: {
        members: { some: { userId } },
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      },
    }),
    prisma.team.findMany({
      where: {
        members: { some: { userId } },
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      },
      include: {
        members: { where: { userId }, select: { id: true, role: true } },
        ledger: true,
        subscription: { include: { plan: true } },
        imageFile: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption),
    }),
  ]);

  return {
    data: teams.map((team) => ({
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role:
        (team.members.find((member) => member.id === userId)?.role as TeamRole) ?? TeamRole.VIEWER,
      name: { value: team.name, editable: team.members[0]?.role !== TeamRole.VIEWER },
      about: { value: team.about || '', editable: team.members[0]?.role !== TeamRole.VIEWER },
      profile: { value: team.profile || '', editable: team.members[0]?.role !== TeamRole.VIEWER },
      planType: {
        value: (team.subscription?.plan.type as TPlanType) ?? TPlanType.BEGINNER,
        editable: false,
      },
      totalMembers: team.members.length,
      totalAccountBooks: team.ledger.length,
      bankAccount: {
        value: team.bankInfo
          ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
          : '',
        editable: team.members[0]?.role !== TeamRole.VIEWER,
      },
      paymentStatus:
        (team.subscription?.paymentStatus as TeamPaymentStatus) ?? TeamPaymentStatus.FREE,
    })),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
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
        about: teamData.about ?? '',
        profile: teamData.profile ?? '',
        bankInfo: teamData.bankInfo ?? { code: '', number: '' },
        createdAt: now,
        updatedAt: now,
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
      const newUserEmails = teamData.members.filter((email) => !existingUserEmails.has(email));

      // Info: (20250304 - Tzuhan) 3.1 批量插入 `teamMember`
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
      }

      // Info: (20250304 - Tzuhan) 3.2 批量插入 `pendingTeamMember`
      if (newUserEmails.length > 0) {
        await tx.pendingTeamMember.createMany({
          data: newUserEmails.map((email) => ({
            teamId: newTeam.id,
            email,
            createdAt: now,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Info: (20250304 - Tzuhan) 54. 創建 `TeamSubscription`
    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planId: plan.id,
        autoRenewal: false,
        startDate: now,
        expiredDate: now + 30 * 24 * 60 * 60, // Info: (20250304 - Tzuhan) 預設 30 天後過期
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

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });

  const existingUserEmails = new Set(existingUsers.map((user) => user.email));
  const newUserEmails = emails.filter((email) => !existingUserEmails.has(email));

  try {
    await prisma.$transaction(async (tx) => {
      if (existingUsers.length > 0) {
        await tx.teamMember.createMany({
          data: existingUsers.map((user) => ({
            teamId,
            userId: user.id,
            role: TeamRole.EDITOR,
            joinedAt: now,
          })),
          skipDuplicates: true,
        });
      }

      if (newUserEmails.length > 0) {
        await tx.pendingTeamMember.createMany({
          data: newUserEmails.map((email) => ({
            teamId,
            email,
            createdAt: now,
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

export async function createDefaultTeamForUser(userId: number, userName: string) {
  const teamName = `${userName}'s Team`;

  const team = await createTeam(userId, {
    name: teamName,
  });

  return team;
}

export async function isEligibleToCreateCompanyInTeam(
  userId: number,
  teamId: number
): Promise<boolean> {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: {
        in: [TeamRole.OWNER, TeamRole.EDITOR, TeamRole.ADMIN],
      },
    },
  });
  return !!teamMember;
}
