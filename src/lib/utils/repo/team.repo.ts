import prisma from '@/client';
import { ILeaveTeam, ITeam, TeamRole, LeaveStatus } from '@/interfaces/team';
import { TeamPaymentStatus } from '@prisma/client';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { listByTeamIdQuerySchema } from '@/lib/utils/zod_schema/team';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { STATUS_MESSAGE } from '@/constants/status_code';

const createOrderByList = (sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) => {
  return sortOptions.map(({ sortBy, sortOrder }) => ({
    createdAt: sortBy === SortBy.CREATED_AT || sortBy === SortBy.DATE ? sortOrder : SortOrder.DESC,
  }));
};

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
      },
      include: {
        members: true,
        accountBook: true,
        imageFile: true,
      },
    });

    // Info: (20250305 - Tzuhan) 3. 將創建者加入 `teamMember`
    await tx.teamMember.create({
      data: {
        teamId: newTeam.id,
        userId,
        role: TeamRole.OWNER,
        joinedAt: now,
      },
    });

    // Info: (20250304 - Tzuhan) 4. 遍歷 `members`，判斷 Email 是否存在於 `User`
    if (teamData.members && teamData.members.length > 0) {
      const existingUsers = await tx.user.findMany({
        where: { email: { in: teamData.members } },
        select: { id: true, email: true },
      });

      const existingUserEmails = new Set(existingUsers.map((user) => user.email));
      const newUserEmails = teamData.members.filter((email) => !existingUserEmails.has(email));

      // Info: (20250304 - Tzuhan) 4.1 批量插入 `teamMember`
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

      // Info: (20250304 - Tzuhan) 4.2 批量插入 `pendingTeamMember`
      if (newUserEmails.length > 0) {
        await tx.pendingTeamMember.createMany({
          data: newUserEmails.map((email) => ({
            teamId: newTeam.id,
            email,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Info: (20250304 - Tzuhan) 5. 創建 `TeamSubscription`
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
      totalMembers: newTeam.members.length + 1, // Info: (20250305 - Tzuhan) 因為創建者也加入了
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
    return null;
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
      }

      // Info: (20250307 - Tzuhan) 3️ 對於 `email` 尚未註冊的用戶，新增 `pendingTeamMember`
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

export const listAccountBooksByTeamId = async (
  userId: number,
  queryParams: z.infer<typeof listByTeamIdQuerySchema>
): Promise<IPaginatedOptions<IAccountBookForUserWithTeam[]>> => {
  const {
    teamId,
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  // Info: (20250221 - tzuhan) 使用 Prisma Transaction 查詢總數、帳本數據、Admin 資料
  const [totalCount, accountBooks] = await prisma.$transaction([
    prisma.company.count({
      where: {
        teamId: Number(teamId),
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        OR: [
          {
            isPrivate: false,
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          }, // Info: (20250221 - tzuhan) 公開帳本
          {
            isPrivate: true,
            team: {
              members: {
                some: {
                  userId,
                  role: { in: [TeamRole.OWNER, TeamRole.ADMIN] }, // Info: (20250221 - tzuhan) 只有 OWNER / ADMIN 可以看到
                  status: LeaveStatus.IN_TEAM,
                },
              },
            },
          },
        ],
      },
    }),
    prisma.company.findMany({
      where: {
        teamId: Number(teamId),
        createdAt: { gte: startDate, lte: endDate },
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        OR: [
          {
            isPrivate: false,
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          }, // Info: (20250221 - tzuhan) 公開帳本
          {
            isPrivate: true,
            team: {
              members: {
                some: {
                  userId,
                  role: { in: [TeamRole.OWNER, TeamRole.ADMIN] }, // Info: (20250221 - tzuhan) 只有 OWNER / ADMIN 可以看到
                  status: LeaveStatus.IN_TEAM,
                },
              },
            },
          },
        ],
      },
      include: {
        team: {
          include: {
            members: {
              where: { status: LeaveStatus.IN_TEAM },
              select: { id: true, userId: true, role: true },
            },
            accountBook: true,
            subscription: { include: { plan: true } },
            imageFile: { select: { id: true, url: true } },
          },
        },
        imageFile: { select: { id: true, url: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: createOrderByList(sortOption),
    }),
  ]);

  // Info: (20250306 - tzuhan) 查詢 in 資料
  const admins = await prisma.admin.findMany({
    where: {
      userId,
      companyId: { in: accountBooks.map((book) => book.id) }, // Info: (20250306 - tzuhan) 只查詢 `accountBooks` 內的 `companyId`
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    select: {
      companyId: true,
      role: true,
      tag: true,
      order: true,
    },
  });

  return toPaginatedData({
    data: accountBooks.map((book) => {
      // Info: (20250306 - Tzuhan) 找到 Admin 資料，admin 是顯示 userId 在 company 內的管理角色
      const admin = admins.find((item) => item.companyId === book.id);
      // Info: (20250306 - Tzuhan) 找到 TeamMember 資料，teamRole 是顯示 userId 在 team 內的角色
      const teamRole =
        ((book.team?.members.find((member) => member.userId === userId)?.role ??
          TeamRole.VIEWER) as TeamRole) || TeamRole.VIEWER;
      return {
        company: {
          id: book.id,
          imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
          name: book.name,
          taxId: book.taxId,
          startDate: book.startDate,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
          isPrivate: book.isPrivate ?? false,
        },
        team: book.team
          ? {
              id: book.team.id,
              imageId: book.team.imageFile?.url ?? '/images/fake_team_img.svg',
              role: teamRole,
              name: { value: book.team.name, editable: teamRole !== TeamRole.VIEWER },
              about: { value: book.team.about ?? '', editable: teamRole !== TeamRole.VIEWER },
              profile: { value: book.team.profile ?? '', editable: teamRole !== TeamRole.VIEWER },
              planType: {
                value: book.team.subscription?.plan.type ?? TPlanType.BEGINNER,
                editable: false,
              },
              totalMembers: book.team.members.length || 0,
              totalAccountBooks: book.team.accountBook.length || 0,
              bankAccount: {
                value: book.team.bankInfo
                  ? `${(book.team.bankInfo as { code: string }).code}-${(book.team.bankInfo as { number: string }).number}`
                  : '',
                editable: false,
              },
            }
          : null,
        tag: admin?.tag,
        order: admin?.order,
        role: admin?.role,
        isTransferring: false, // ToDo: (20250306 - Tzuhan) 待DB新增欄位後更新成正確值
      } as IAccountBookForUserWithTeam;
    }),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });
};

export const memberLeaveTeam = async (teamId: number, userId: number): Promise<ILeaveTeam> => {
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (!teamMember) {
    throw new Error(STATUS_MESSAGE.USER_NOT_IN_TEAM);
  }

  if (teamMember.role === TeamRole.OWNER || teamMember.role === TeamRole.ADMIN) {
    throw new Error(STATUS_MESSAGE.ONLY_EDITOR_AND_VIEWER_CAN_LEAVE);
  }

  const leftAt = Math.floor(Date.now() / 1000); // 以 UNIX 時間戳記記錄
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
    role: teamMember.role as TeamRole,
    status: LeaveStatus.NOT_IN_TEAM,
    leftAt,
  };
};
