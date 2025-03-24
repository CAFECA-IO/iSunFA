import prisma from '@/client';
import { ITeam, TeamRole, LeaveStatus } from '@/interfaces/team';
import { InviteStatus, TeamPaymentStatus } from '@prisma/client';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { createOrderByList } from '@/lib/utils/sort';
import { MAX_TEAM_LIMIT } from '@/interfaces/permissions';

export const getTeamList = async (
  userId: number,
  queryParams: z.infer<typeof paginatedDataQuerySchema>
): Promise<IPaginatedOptions<ITeam[]>> => {
  const {
    page,
    pageSize,
    startDate,
    endDate,
    searchQuery,
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

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
        subscription: { include: { plan: true } },
        imageFile: { select: { id: true, url: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption),
    }),
  ]);

  return toPaginatedData({
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
      totalAccountBooks: team.accountBook.length,
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

    // Info: (20250304 - Tzuhan) 6. 創建 `TeamSubscription`
    await tx.teamSubscription.create({
      data: {
        teamId: newTeam.id,
        planId: plan.id,
        autoRenewal: false,
        startDate: now,
        expiredDate: now + 30 * 24 * 60 * 60, // Info: (20250304 - Tzuhan) 預設 30 天後過期
        paymentStatus: TeamPaymentStatus.FREE,
      },
    });

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
    };
  });
};

export const getTeamByTeamId = async (teamId: number, userId: number): Promise<ITeam | null> => {
  const teamMember = await prisma.teamMember.findFirst({
    where: { teamId, userId },
  });
  if (!teamMember) {
    throw new Error('USER_NOT_IN_TEAM');
  }
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
      subscription: {
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
  const planType = team.subscription
    ? (team.subscription.plan.type as TPlanType)
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
  };
};

export async function createDefaultTeamForUser(userId: number, userName: string) {
  const teamName = `${userName}'s Team`;

  const team = await createTeam(userId, {
    name: teamName,
  });

  return team;
}

/**
 * Updates the team's icon with the provided file ID
 * Info: (20250324 - Shirley) Similar to putCompanyIcon, this function connects a file to a team
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
