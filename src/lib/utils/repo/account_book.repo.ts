import prisma from '@/client';
import {
  TeamRole,
  LeaveStatus,
  ITransferAccountBook,
  TransferStatus,
  ITeam,
} from '@/interfaces/team';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { z } from 'zod';
import { SortBy, SortOrder } from '@/constants/sort';
import { TPlanType } from '@/interfaces/subscription';
import { IAccountBook, IAccountBookWithTeam, WORK_TAG } from '@/interfaces/account_book';
import { listByTeamIdQuerySchema } from '@/lib/utils/zod_schema/team';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import loggerBack from '@/lib/utils/logger_back';
import { SUBSCRIPTION_PLAN_LIMITS } from '@/constants/team/permissions';
import { ITeamRoleCanDo, TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { createOrderByList } from '@/lib/utils/sort';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder } from '@/constants/file';
import { getTimestampNow } from '@/lib/utils/common';
import { getTeamList } from '@/lib/utils/repo/team.repo';
import { DEFAULT_MAX_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { createAccountingSetting } from '@/lib/utils/repo/accounting_setting.repo';

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

export const getAccountBookById = async (id: number): Promise<IAccountBook | null> => {
  let result: IAccountBook | null = null;
  const accountBook = await prisma.company.findUnique({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    include: {
      imageFile: true, // Info: (20250327 - Tzuhan) 這裡才會拿到 imageFile.url
    },
  });
  if (accountBook) {
    result = {
      ...accountBook,
      imageId: accountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      tag: accountBook.tag as WORK_TAG,
    };
  }
  return result;
};

export const getAccountBookByNameAndTeamId = async (
  teamId: number,
  taxId: string
): Promise<IAccountBook | null> => {
  let result: IAccountBook | null = null;
  const accountBook = await prisma.company.findFirst({
    where: {
      taxId,
      teamId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    orderBy: {
      updatedAt: SortOrder.DESC,
    },
    include: {
      imageFile: true, // Info: (20250327 - Tzuhan) 這裡才會拿到 imageFile.url
    },
  });
  if (accountBook) {
    result = {
      ...accountBook,
      imageId: accountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      tag: accountBook.tag as WORK_TAG,
    };
  }
  return result;
};

export const createAccountBook = async (
  userId: number,
  body: {
    name: string;
    tag: WORK_TAG;
    taxId: string;
    teamId: number;
  }
): Promise<IAccountBook | null> => {
  let accountBook: IAccountBook | null = null;
  let { teamId } = body;
  const { taxId, name, tag } = body;
  loggerBack.info(`User ${userId} is creating a new AccountBook in Team ${teamId}`);

  // Info: (20250124 - Shirley) Step 1.
  const accountBookIfExist = await getAccountBookByNameAndTeamId(teamId, taxId);
  if (accountBookIfExist) {
    throw new Error('DUPLICATE_ACCOUNT_BOOK');
  } else {
    // Info: (20250124 - Shirley) Step 2.
    const companyIcon = await generateIcon(name);
    const nowInSecond = getTimestampNow();
    const imageName = name + '_icon' + nowInSecond;
    const file = await createFile({
      name: imageName,
      size: companyIcon.size,
      mimeType: companyIcon.mimeType,
      type: FileFolder.TMP,
      url: companyIcon.iconUrl,
      isEncrypted: false,
      encryptedSymmetricKey: '',
    });
    if (!file) {
      throw new Error('INTERNAL_SERVER_ERROR');
    }
    if (teamId) {
      const hasPermission = await isEligibleToCreateAccountBookInTeam(userId, teamId);
      if (!hasPermission) {
        throw new Error('ACCOUNT_BOOK_LIMIT_REACHED');
      }
    } else {
      // Info: (20250303 - Shirley) 如果沒有提供 teamId，則獲取用戶的 team 列表
      const userTeams = await getTeamList(userId, {
        page: DEFAULT_PAGE_START_AT,
        pageSize: DEFAULT_MAX_PAGE_LIMIT,
      });
      if (userTeams && userTeams.data.length > 0) {
        // Info: (20250303 - Shirley) 使用用戶的第一個 team（通常是默認 team）
        teamId = +userTeams.data[0].id;
      }
    }
    const createdAccountBook = await prisma.company.create({
      data: {
        teamId,
        userId,
        name,
        taxId,
        imageFileId: file.id,
        startDate: nowInSecond,
        tag,
        isPrivate: false,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
      include: {
        imageFile: true, // 如果你需要回傳 image.url
      },
    });
    accountBook = {
      ...createdAccountBook,
      ...body,
      imageId: createdAccountBook.imageFile?.url ?? '/images/fake_company_img.svg',
    };
    // Info: (20250124 - Shirley) Step 4.
    const companyKeyPair = await generateKeyPair();
    await storeKeyByCompany(createdAccountBook.id, companyKeyPair);
    // Info: (20250124 - Shirley) Step 5.
    await createAccountingSetting(createdAccountBook.id);
  }
  return accountBook;
};

export const listAccountBookByUserId = async (
  userId: number,
  queryParams: {
    page?: number;
    pageSize?: number;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
  }
): Promise<IPaginatedOptions<IAccountBookWithTeam[]>> => {
  const {
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  // Info: (20250337 - Tzuhan) 查詢 User 所屬的所有 Team
  const userTeams = await prisma.teamMember.findMany({
    where: {
      userId,
      status: LeaveStatus.IN_TEAM,
    },
    select: { teamId: true },
  });

  const teamIds = userTeams.map((team) => team.teamId);

  if (teamIds.length === 0) {
    return toPaginatedData({
      data: [],
      page,
      totalPages: 0,
      totalCount: 0,
      pageSize,
      sort: sortOption,
    });
  }

  // Info: (20250337 - Tzuhan) 查詢 Team 內的所有 Company (帳本) 總數
  const totalCount = await prisma.company.count({
    where: {
      teamId: { in: teamIds },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      createdAt: { gte: startDate, lte: endDate },
      AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
    },
  });

  const nowInSecond = getTimestampNow();

  // Info: (20250337 - Tzuhan) 取得帳本資訊，包含所屬 Team
  const accountBooks = await prisma.company.findMany({
    where: {
      teamId: { in: teamIds },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      createdAt: { gte: startDate, lte: endDate },
      AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
    },
    include: {
      team: {
        include: {
          members: {
            where: { status: LeaveStatus.IN_TEAM },
            select: { id: true, userId: true, role: true },
          },
          accountBook: true,
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
          imageFile: { select: { id: true, url: true } },
        },
      },
      imageFile: { select: { id: true, url: true } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption),
  });

  // Info: (20250337 - Tzuhan) 格式化回傳數據
  return toPaginatedData({
    data: accountBooks.map((book) => {
      const teamMember = book.team?.members.find((member) => member.userId === userId);
      const teamRole = (teamMember?.role ?? TeamRole.VIEWER) as TeamRole;

      return {
        id: book.id,
        imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
        name: book.name,
        taxId: book.taxId,
        startDate: book.startDate,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        isPrivate: book.isPrivate ?? false,
        tag: book.tag as WORK_TAG,
        team: book.team
          ? {
              id: book.team.id,
              imageId: book.team.imageFile?.url ?? '/images/fake_team_img.svg',
              role: teamRole,
              name: { value: book.team.name, editable: teamRole !== TeamRole.VIEWER },
              about: { value: book.team.about ?? '', editable: teamRole !== TeamRole.VIEWER },
              profile: { value: book.team.profile ?? '', editable: teamRole !== TeamRole.VIEWER },
              planType: {
                value: book.team.subscriptions[0]?.plan.type ?? TPlanType.BEGINNER,
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
        isTransferring: false, // ToDo: (20250306 - Tzuhan) 待DB新增欄位後更新成正確值
      } as IAccountBookWithTeam;
    }),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });
};

export const listAccountBooksByTeamId = async (
  userId: number,
  queryParams: z.infer<typeof listByTeamIdQuerySchema>
): Promise<IPaginatedOptions<IAccountBookWithTeam[]>> => {
  const {
    teamId,
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;
  const nowInSecond = getTimestampNow();

  // Info: (20250221 - tzuhan) 使用 Prisma Transaction 查詢總數、帳本數據
  const [totalCount, accountBooks] = await prisma.$transaction([
    prisma.company.count({
      where: {
        teamId: Number(teamId),
        name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
        createdAt: { gte: startDate, lte: endDate },
        AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
        OR: [
          {
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  userId,
                  role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
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
            team: {
              members: {
                some: { status: LeaveStatus.IN_TEAM },
              },
            },
          },
          {
            team: {
              members: {
                some: {
                  userId,
                  role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
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
              select: { id: true, userId: true, role: true }, // ✅ 取得 accountBookRole
            },
            accountBook: true,
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

  return toPaginatedData({
    data: accountBooks.map((book) => {
      // ✅ (20250324 - Tzuhan) 修正 teamRole 取得方式
      const teamMember = book.team?.members.find((member) => member.userId === userId);
      const teamRole = (teamMember?.role ?? TeamRole.VIEWER) as TeamRole;

      return {
        id: book.id,
        imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
        name: book.name,
        taxId: book.taxId,
        startDate: book.startDate,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        isPrivate: book.isPrivate ?? false,
        tag: book.tag as WORK_TAG, // ✅ (20250324 - Tzuhan) 直接取用 tag
        team: book.team
          ? {
              id: book.team.id,
              imageId: book.team.imageFile?.url ?? '/images/fake_team_img.svg',
              role: teamRole,
              name: { value: book.team.name, editable: teamRole !== TeamRole.VIEWER },
              about: { value: book.team.about ?? '', editable: teamRole !== TeamRole.VIEWER },
              profile: { value: book.team.profile ?? '', editable: teamRole !== TeamRole.VIEWER },
              planType: {
                value: book.team.subscriptions[0]?.plan.type ?? TPlanType.BEGINNER,
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
        isTransferring: false, // ToDo: (20250306 - Tzuhan) 待DB新增欄位後更新成正確值
      } as IAccountBookWithTeam;
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

  const nowInSecond = getTimestampNow();

  // Info: (20250311 - Tzuhan) 確保目標團隊 `toTeamId` 存在
  const targetTeam = await prisma.team.findUnique({
    where: { id: toTeamId },
    include: {
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
    },
  });

  if (!targetTeam) {
    throw new Error('TEAM_NOT_FOUND');
  }

  // Info: (20250311 - Tzuhan) 確保轉入團隊的 `subscription.planType` 不會超過上限
  const planType = targetTeam.subscriptions[0]?.plan.type || TPlanType.BEGINNER;
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

/**
 * Info: (20250329 - Shirley) This function fetches complete IAccountBookWithTeam data in one query
 * for the status_info API. It retrieves the account book, user role, team info, and other necessary data
 * using Prisma's relation capabilities to minimize database queries.
 * @param userId The ID of the user
 * @param companyId The ID of the company/account book
 * @param teamId The ID of the team the account book belongs to
 * @returns A promise resolving to IAccountBookWithTeam object or null if not found
 */
export async function getAccountBookForUserWithTeam(
  userId: number,
  companyId: number,
  teamId: number
): Promise<IAccountBookWithTeam | null> {
  if (userId <= 0 || companyId <= 0 || teamId <= 0) {
    return null;
  }

  try {
    // Info: (20250329 - Shirley) Check if user is a member of the team
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

    // Info: (20250329 - Shirley) If user is not a member of the team, return null
    if (!teamMember) {
      return null;
    }

    // Info: (20250329 - Shirley) Get the company/account book that belongs to the team
    const accountBook = await prisma.company.findFirst({
      where: {
        id: companyId,
        teamId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      include: {
        imageFile: true,
      },
    });

    // Info: (20250329 - Shirley) If the account book doesn't exist or doesn't belong to the team, return null
    if (!accountBook) {
      return null;
    }

    const nowInSecond = getTimestampNow();

    // Info: (20250329 - Shirley) Get team information
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { status: LeaveStatus.IN_TEAM },
          select: { id: true, userId: true, role: true },
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
      return null;
    }

    // Info: (20250329 - Shirley) Get user's role in the team
    const userRole = (teamMember.role as TeamRole) || TeamRole.VIEWER;

    // Info: (20250329 - Shirley) Get team's plan type
    const planType = team.subscriptions[0]
      ? (team.subscriptions[0].plan.type as TPlanType)
      : TPlanType.BEGINNER;

    // Info: (20250329 - Shirley) Transform data to ITeam format
    const teamInfo: ITeam = {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: userRole,
      name: {
        value: team.name,
        editable: userRole !== TeamRole.VIEWER,
      },
      about: {
        value: team.about || '',
        editable: userRole !== TeamRole.VIEWER,
      },
      profile: {
        value: team.profile || '',
        editable: userRole !== TeamRole.VIEWER,
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
        editable: userRole !== TeamRole.VIEWER,
      },
    };

    // Info: (20250329 - Shirley) Since we're not using admin table anymore, we need default values for tag and order
    // These will be determined by business requirements or replaced in the future
    return {
      id: accountBook.id,
      userId: accountBook.userId,
      imageId: accountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      name: accountBook.name,
      taxId: accountBook.taxId,
      startDate: accountBook.startDate,
      createdAt: accountBook.createdAt,
      updatedAt: accountBook.updatedAt,
      isPrivate: accountBook.isPrivate ?? false,
      teamId,
      tag: WORK_TAG.ALL, // Default tag
      team: teamInfo,
      isTransferring: accountBook.isTransferring ?? false,
    };
  } catch (error) {
    loggerBack.error({
      error,
      userId,
      companyId,
      teamId,
      message: 'Failed to get AccountBookForUserWithTeam',
    });
    return null;
  }
}

/**
 * Info: (20250401 - Shirley) This function efficiently finds a user's account book by companyId
 * across all teams the user is a member of. It uses Prisma's relational queries to minimize
 * database access.
 * @param userId The ID of the user
 * @param companyId The ID of the company/account book
 * @param teamIds Optional array of team IDs to search within (if known)
 * @returns A promise resolving to IAccountBookWithTeam object or null if not found
 */
export async function findUserAccountBook(
  userId: number,
  companyId: number,
  teamIds?: number[]
): Promise<IAccountBookWithTeam | null> {
  if (userId <= 0 || companyId <= 0) {
    return null;
  }

  const nowInSecond = getTimestampNow();

  try {
    // Info: (20250401 - Shirley) Start by finding the specific account book
    const accountBook = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
        // Info: (20250401 - Shirley) Only include account books from teams where user is a member
        team: {
          members: {
            some: {
              userId,
              status: LeaveStatus.IN_TEAM,
            },
          },
          // Info: (20250401 - Shirley) If teamIds are provided, further filter by those teams
          ...(teamIds && teamIds.length > 0 ? { id: { in: teamIds } } : {}),
        },
      },
      include: {
        imageFile: true,
        team: {
          include: {
            members: {
              where: {
                userId,
                status: LeaveStatus.IN_TEAM,
              },
              select: {
                role: true,
              },
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
        },
      },
    });

    // Info: (20250401 - Shirley) If no account book found or it's not associated with a team, return null
    if (!accountBook || !accountBook.team) {
      return null;
    }

    const { team } = accountBook;
    // Info: (20250401 - Shirley) We should have exactly one matching team member since we filtered by userId
    const userRole = team.members.length > 0 ? (team.members[0].role as TeamRole) : TeamRole.VIEWER;

    const planType = team.subscriptions[0]
      ? (team.subscriptions[0].plan.type as TPlanType)
      : TPlanType.BEGINNER;

    // Info: (20250401 - Shirley) Count the total account books in this team in a separate query
    const totalAccountBooks = await prisma.company.count({
      where: {
        teamId: team.id,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });

    // Info: (20250401 - Shirley) Count total members in this team
    const totalMembers = await prisma.teamMember.count({
      where: {
        teamId: team.id,
        status: LeaveStatus.IN_TEAM,
      },
    });

    // Info: (20250401 - Shirley) Transform data to ITeam format
    const teamInfo: ITeam = {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: userRole,
      name: {
        value: team.name,
        editable: userRole !== TeamRole.VIEWER,
      },
      about: {
        value: team.about || '',
        editable: userRole !== TeamRole.VIEWER,
      },
      profile: {
        value: team.profile || '',
        editable: userRole !== TeamRole.VIEWER,
      },
      planType: {
        value: planType,
        editable: false,
      },
      totalMembers,
      totalAccountBooks,
      bankAccount: {
        value: team.bankInfo
          ? `${(team.bankInfo as { code: string }).code}-${(team.bankInfo as { number: string }).number}`
          : '',
        editable: userRole !== TeamRole.VIEWER,
      },
    };

    // Info: (20250325 - Shirley) Return the formatted account book data
    return {
      id: accountBook.id,
      userId: accountBook.userId,
      imageId: accountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      name: accountBook.name,
      taxId: accountBook.taxId,
      startDate: accountBook.startDate,
      createdAt: accountBook.createdAt,
      updatedAt: accountBook.updatedAt,
      isPrivate: accountBook.isPrivate ?? false,
      teamId: team.id,
      tag: WORK_TAG.ALL, // Info: (20250325 - Shirley) Default tag

      team: teamInfo,
      isTransferring: accountBook.isTransferring ?? false,
    };
  } catch (error) {
    loggerBack.error({
      error,
      userId,
      companyId,
      teamIds,
      message: 'Failed to find user account book',
    });
    return null;
  }
}

export const updateAccountBook = async (
  userId: number,
  accountBookId: number,
  body: {
    name?: string;
    tag?: WORK_TAG;
    taxId?: string;
    teamId?: number;
  }
): Promise<IAccountBook | null> => {
  let result: IAccountBook | null = null;
  const { name, tag, taxId, teamId } = body;

  const accountBook = await prisma.company.findFirst({
    where: {
      id: accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  if (!accountBook) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }

  const updatedAccountBook = await prisma.company.update({
    where: { id: accountBookId },
    data: {
      name,
      tag,
      taxId,
      teamId,
      updatedAt: getTimestampNow(),
    },
    include: {
      imageFile: true, // Info: (20250327 - Tzuhan) 這裡才會拿到 imageFile.url
    },
  });

  if (updatedAccountBook) {
    result = {
      ...updatedAccountBook,
      imageId: updatedAccountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      tag: updatedAccountBook.tag as WORK_TAG,
    };
  }
  return result;
};

export const deleteAccountBook = async (accountBookId: number): Promise<IAccountBook | null> => {
  let result: IAccountBook | null = null;

  const accountBook = await prisma.company.findFirst({
    where: {
      id: accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  if (!accountBook) {
    throw new Error('ACCOUNT_BOOK_NOT_FOUND');
  }
  const nowInSecond = getTimestampNow();

  const updatedAccountBook = await prisma.company.update({
    where: { id: accountBookId },
    data: {
      deletedAt: nowInSecond,
      updatedAt: nowInSecond,
    },
    include: {
      imageFile: true,
    },
  });

  if (updatedAccountBook) {
    result = {
      ...updatedAccountBook,
      imageId: updatedAccountBook.imageFile?.url ?? '/images/fake_company_img.svg',
      tag: updatedAccountBook.tag as WORK_TAG,
    };
  }
  return result;
};
