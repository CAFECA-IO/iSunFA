import prisma from '@/client';
import { TeamRole, LeaveStatus, ITransferAccountBook, TransferStatus } from '@/interfaces/team';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { listByTeamIdQuerySchema } from '@/lib/utils/zod_schema/team';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import loggerBack from '@/lib/utils/logger_back';
import { SUBSCRIPTION_PLAN_LIMITS } from '@/constants/team/permissions';
import { ITeamRoleCanDo, TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { createOrderByList } from '@/lib/utils/sort';

export async function isEligibleToCreateAccountBookInTeam(
  userId: number,
  teamId: number
): Promise<boolean> {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
    },
  });
  const canDo: ITeamRoleCanDo = convertTeamRoleCanDo({
    teamRole: teamMember?.role as TeamRole,
    canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
  }) as ITeamRoleCanDo;
  return canDo.yesOrNo;
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
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        createdAt: { gte: startDate, lte: endDate },
        AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        OR: [
          {
            // isPrivate: false, // Info: (20250321 - Tzuhan) this property is no longer used
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          }, // Info: (20250221 - tzuhan) 公開帳本
          {
            // isPrivate: true,
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
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        createdAt: { gte: startDate, lte: endDate },
        AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        OR: [
          {
            // isPrivate: false,
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          }, // Info: (20250221 - tzuhan) 公開帳本
          {
            // isPrivate: true,
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
  const admin = await prisma.admin.findFirst({
    where: {
      companyId: { in: accountBooks.map((book) => book.id) }, // Info: (20250306 - tzuhan) 只查詢 `accountBooks` 內的 `companyId`
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    select: {
      companyId: true,
      roleId: true,
      role: true,
      tag: true,
      order: true,
    },
  });

  loggerBack.info(`admin: ${JSON.stringify(admin)}`);

  return toPaginatedData({
    data: accountBooks.map((book) => {
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

// Info: (20250311 - Tzuhan) 發起帳本轉移
export const requestTransferAccountBook = async (
  userId: number,
  accountBookId: number,
  fromTeamId: number,
  toTeamId: number
): Promise<ITransferAccountBook> => {
  loggerBack.info(
    `User ${userId} is requesting to transfer AccountBook ${accountBookId} to Team ${toTeamId}`
  );

  // Info: (20250311 - Tzuhan) 確保用戶是 `Owner` 或 `Admin`
  const userTeamRole = await prisma.teamMember.findFirst({
    where: { teamId: fromTeamId, userId },
    select: { role: true },
  });
  if (!userTeamRole) {
    throw new Error('FORBIDDEN');
  }

  const canDo = convertTeamRoleCanDo({
    teamRole: userTeamRole.role as TeamRole,
    canDo: TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
  });

  if (!(canDo as ITeamRoleCanDo).yesOrNo) {
    throw new Error('FORBIDDEN');
  }

  // Info: (20250314 - Tzuhan) Todo: check if accountBookId is in fromTeamId
  const accountBook = await prisma.company.findFirst({
    where: { id: accountBookId, teamId: fromTeamId },
  });
  if (!accountBook) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保目標團隊 `toTeamId` 存在
  const targetTeam = await prisma.team.findUnique({
    where: { id: toTeamId },
    include: {
      subscription: {
        include: { plan: true }, // Info: (20250311 - Tzuhan) 正確關聯到 TeamPlan，才能取得 planType
      },
    },
  });

  if (!targetTeam) {
    throw new Error('TEAM_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保轉入團隊的 `subscription.planType` 不會超過上限
  const planType = targetTeam.subscription?.plan?.type || TPlanType.BEGINNER;
  const accountBookCount = await prisma.company.count({ where: { teamId: toTeamId } });

  if (
    accountBookCount >= SUBSCRIPTION_PLAN_LIMITS[planType as keyof typeof SUBSCRIPTION_PLAN_LIMITS]
  ) {
    throw new Error('EXCEED_PLAN_LIMIT');
  }

  // Info: (20250311 - Tzuhan) 更新帳本 `isTransferring = true`
  /** Info: (20250313 - Tzuhan) 目前因為通知系統還沒有做好，所以跟邀請member一樣，這邊對方都不會收到確認通知，會直接轉移成功
  await prisma.company.update({
    where: { id: accountBookId },
    data: { isTransferring: true },
  });
  */

  const record = {
    companyId: accountBookId,
    fromTeamId,
    toTeamId,
    initiatedByUserId: userId,
    status: TransferStatus.COMPLETED, // Info: (20250313 - Tzuhan) 目前因為通知系統還沒有做好，所以直接設定為 COMPLETED
  };
  await prisma.$transaction([
    // Info: (20250311 - Tzuhan) 建立 `accountBook_transfer` 記錄
    prisma.accountBookTransfer.create({
      data: record,
    }),
    // Info: (20250311 - Tzuhan) 更新 `company.teamId` & `company.isTransferring`
    prisma.company.update({
      where: { id: accountBookId },
      data: { teamId: toTeamId, isTransferring: false },
    }),
  ]);

  return { ...record, accountBookId: record.companyId } as ITransferAccountBook;
};

// Info: (20250314 - Tzuhan) 取消帳本轉移: 邏輯部分實作未檢查是否充分也還未測試
export const cancelTransferAccountBook = async (
  userId: number,
  accountBookId: number
): Promise<void> => {
  loggerBack.info(`User ${userId} is canceling transfer for AccountBook ${accountBookId}`);

  // Info: (20250311 - Tzuhan) 找到帳本的 `transfer` 記錄
  const transfer = await prisma.accountBookTransfer.findFirst({
    where: { companyId: accountBookId, status: TransferStatus.PENDING },
  });

  if (!transfer) {
    throw new Error('TRANSFER_RECORD_NOT_FOUND');
  } else if (transfer.status !== TransferStatus.PENDING) {
    throw new Error(`TRANSFER_RECORD_IS_${transfer.status}`);
  }
  const accountBook = await prisma.company.findFirst({
    where: { id: accountBookId, teamId: transfer.fromTeamId },
  });
  if (!accountBook) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保用戶有權限取消
  const userTeamRole = await prisma.teamMember.findFirst({
    where: { teamId: transfer.fromTeamId, userId },
    select: { role: true },
  });

  if (!userTeamRole) {
    throw new Error('FORBIDDEN');
  }

  const canDo = convertTeamRoleCanDo({
    teamRole: userTeamRole.role as TeamRole,
    canDo: TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER,
  });

  if (!(canDo as ITeamRoleCanDo).yesOrNo) {
    throw new Error('FORBIDDEN');
  }
  // Info: (20250311 - Tzuhan) 更新 `accountBook_transfer` 狀態 & `company.isTransferring`
  await prisma.$transaction([
    prisma.accountBookTransfer.update({
      where: { id: transfer.id },
      data: { status: TransferStatus.CANCELED },
    }),
    prisma.company.update({
      where: { id: accountBookId },
      data: { isTransferring: false },
    }),
  ]);
};

// Info: (20250314 - Tzuhan) 接受帳本轉移: 邏輯部分實作未檢查是否充分也還未測試
export const acceptTransferAccountBook = async (
  userId: number,
  accountBookId: number
): Promise<void> => {
  loggerBack.info(`User ${userId} is accepting transfer for AccountBook ${accountBookId}`);

  // Info: (20250311 - Tzuhan) 找到帳本的 `transfer` 記錄
  const transfer = await prisma.accountBookTransfer.findFirst({
    where: { companyId: accountBookId, status: TransferStatus.PENDING },
  });

  if (!transfer) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保用戶是 `toTeamId` 的 `Owner` 或 `Admin`
  const userTeamRole = await prisma.teamMember.findFirst({
    where: { teamId: transfer.toTeamId, userId },
    select: { role: true },
  });

  if (!userTeamRole) {
    throw new Error('FORBIDDEN');
  }

  const canDo = convertTeamRoleCanDo({
    teamRole: userTeamRole.role as TeamRole,
    canDo: TeamPermissionAction.ACCEPT_ACCOUNT_BOOK_TRANSFER,
  });

  if (!(canDo as ITeamRoleCanDo).yesOrNo) {
    throw new Error('FORBIDDEN');
  }

  // Info: (20250311 - Tzuhan) 更新 `company.teamId` & `accountBook_transfer` 狀態
  await prisma.$transaction([
    prisma.company.update({
      where: { id: accountBookId },
      data: { teamId: transfer.toTeamId, isTransferring: false },
    }),
    prisma.accountBookTransfer.update({
      where: { id: transfer.id },
      data: { status: TransferStatus.COMPLETED },
    }),
  ]);
};

// Info: (20250314 - Tzuhan) 拒絕帳本轉移: 邏輯部分實作未檢查是否充分也還未測試
export const declineTransferAccountBook = async (
  userId: number,
  accountBookId: number
): Promise<void> => {
  loggerBack.info(`User ${userId} is declining transfer for AccountBook ${accountBookId}`);

  // Info: (20250311 - Tzuhan) 找到帳本的 `transfer` 記錄
  const transfer = await prisma.accountBookTransfer.findFirst({
    where: { companyId: accountBookId, status: TransferStatus.PENDING },
  });

  if (!transfer) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保用戶是 `toTeamId` 的 `Owner` 或 `Admin`
  const userTeamRole = await prisma.teamMember.findFirst({
    where: { teamId: transfer.toTeamId, userId },
    select: { role: true },
  });

  if (!userTeamRole) {
    throw new Error('FORBIDDEN');
  }

  const canDo = convertTeamRoleCanDo({
    teamRole: userTeamRole.role as TeamRole,
    canDo: TeamPermissionAction.DECLINE_ACCOUNT_BOOK_TRANSFER,
  });

  if (!(canDo as ITeamRoleCanDo).yesOrNo) {
    throw new Error('FORBIDDEN');
  }

  // Info: (20250311 - Tzuhan) 更新 `accountBook_transfer` 狀態 & `company.isTransferring`
  await prisma.$transaction([
    prisma.accountBookTransfer.update({
      where: { id: transfer.id },
      data: { status: TransferStatus.DECLINED },
    }),
    prisma.company.update({
      where: { id: accountBookId },
      data: { isTransferring: false },
    }),
  ]);
};
