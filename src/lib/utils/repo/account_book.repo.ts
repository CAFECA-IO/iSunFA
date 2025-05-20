import prisma from '@/client';
import { File } from '@prisma/client';
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
import {
  IAccountBook,
  IAccountBookWithTeam,
  WORK_TAG,
  ACCOUNT_BOOK_ROLE,
  FILING_FREQUENCY,
  FILING_METHOD,
  DECLARANT_FILING_METHOD,
  AGENT_FILING_ROLE,
  IAccountBookSimple,
} from '@/interfaces/account_book';
import { listByTeamIdQuerySchema } from '@/lib/utils/zod_schema/team';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import loggerBack from '@/lib/utils/logger_back';
import { SUBSCRIPTION_PLAN_LIMITS } from '@/constants/team/permissions';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { convertTeamRoleCanDo, getGracePeriodInfo } from '@/lib/shared/permission';
import { createOrderByList } from '@/lib/utils/sort';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { generateKeyPair, storeKeyByCompany } from '@/lib/utils/crypto';
import { createFile, findFileById } from '@/lib/utils/repo/file.repo';
import { FileFolder } from '@/constants/file';
import { getTimestampNow } from '@/lib/utils/common';
import { getTeamList } from '@/lib/utils/repo/team.repo';
import { DEFAULT_MAX_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { assertUserCan } from '@/lib/utils/permission/assert_user_team_permission';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { transaction } from '@/lib/utils/repo/transaction';
import { DEFAULT_ACCOUNTING_SETTING } from '@/constants/setting';
import { checkAccountBookLimit } from '@/lib/utils/plan/check_plan_limit';

/**
 * Info: (20250402 - Shirley) 檢查團隊的帳本數量是否超過限制
 * @param teamId 團隊 ID
 * @returns 如果超過限制則返回 true，否則返回 false
 */
export const checkTeamAccountBookLimit = async (teamId: number): Promise<boolean> => {
  // Info: (20250402 - Shirley) 獲取當前時間戳記（秒）
  const nowInSecond = getTimestampNow();

  // Info: (20250402 - Shirley) 獲取團隊資訊和訂閱計劃
  const team = await prisma.team.findUnique({
    where: { id: teamId },
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

  if (!team) {
    const error = new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    error.name = STATUS_CODE.RESOURCE_NOT_FOUND;
    throw error;
  }

  // Info: (20250402 - Shirley) 獲取團隊下的帳本數量
  const accountBookCount = await prisma.company.count({
    where: {
      teamId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });

  const lastSubscription = team.subscriptions[0];

  // Info: (20250402 - Shirley) 獲取團隊的訂閱計劃，如果找不到對應的計劃類型，默認使用 BEGINNER 計劃
  const planType = lastSubscription?.plan?.type || 'BEGINNER';

  // Info: (20250402 - Shirley) 根據計劃類型確定帳本數量限制
  const limitsByType = SUBSCRIPTION_PLAN_LIMITS as Record<string, number>;
  const accountBookLimit = limitsByType[planType] || limitsByType.BEGINNER;

  // Info: (20250402 - Shirley) 檢查是否超過帳本數量限制
  return accountBookCount >= accountBookLimit;
};

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
  const canDo = convertTeamRoleCanDo({
    teamRole: teamMember?.role as TeamRole,
    canDo: TeamPermissionAction.CREATE_ACCOUNT_BOOK,
  });
  return canDo.can;
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

/**
 * Info: (20250515 - Shirley) 創建帳本
 * @param userId 用戶ID
 * @param body 帳本基本資料，包含姓名、標籤、統一編號等
 * @param body.fileId 選填，文件ID。如果提供則使用該文件作為帳本圖示，否則自動生成圖示
 * @returns 創建的帳本資訊或null
 */
export const createAccountBook = async (
  userId: number,
  body: {
    name: string;
    tag: WORK_TAG;
    taxId: string;
    teamId: number;
    fileId?: number;
    representativeName?: string;
    taxSerialNumber?: string;
    contactPerson?: string;
    phoneNumber?: string;
    city?: string;
    district?: string;
    enteredAddress?: string;
    filingFrequency?: FILING_FREQUENCY;
    filingMethod?: FILING_METHOD;
    declarantFilingMethod?: DECLARANT_FILING_METHOD;
    declarantName?: string;
    declarantPersonalId?: string;
    declarantPhoneNumber?: string;
    agentFilingRole?: AGENT_FILING_ROLE;
    licenseId?: string;
  }
): Promise<IAccountBook | null> => {
  let accountBook: IAccountBook | null = null;
  let { teamId } = body;
  const {
    taxId,
    name,
    tag,
    fileId,
    representativeName = '',
    taxSerialNumber = '',
    contactPerson = '',
    phoneNumber = '',
    city = '',
    district = '',
    enteredAddress = '',
    filingFrequency,
    filingMethod,
    declarantFilingMethod,
    declarantName,
    declarantPersonalId,
    declarantPhoneNumber,
    agentFilingRole,
    licenseId,
  } = body;
  loggerBack.info(`User ${userId} is creating a new AccountBook in Team ${teamId}`);

  // Info: (20250124 - Shirley) Step 1.
  const accountBookIfExist = await getAccountBookByNameAndTeamId(teamId, taxId);
  if (accountBookIfExist) {
    const error = new Error(STATUS_MESSAGE.DUPLICATE_ACCOUNT_BOOK);
    error.name = STATUS_CODE.DUPLICATE_ACCOUNT_BOOK;
    throw error;
  } else {
    // Info: (20250124 - Shirley) Step 2.
    const nowInSecond = getTimestampNow();
    let file: File | null = null;

    // Info: (20250515 - Shirley) 如果提供了 fileId，則使用該文件作為圖像
    if (fileId) {
      const sourceFile = await findFileById(fileId);
      if (!sourceFile) {
        const error = new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
        error.name = STATUS_CODE.RESOURCE_NOT_FOUND;
        throw error;
      }

      // Info: (20250516 - Shirley) 創建文件副本，避免唯一約束衝突 (workaround)
      // TODO: (20250516 - Shirley) 需要創建一個單純上傳 file 的 API，不需指定類型 team/company 跟綁定的 id
      // 因為在 Prisma schema 中 Company 模型可能將 image_file_id 設為唯一欄位
      // 所以我們需要為每個帳本創建獨立的文件記錄
      const clonedFileName = `${name}_icon_${nowInSecond}`;
      file = await createFile({
        name: clonedFileName,
        size: sourceFile.size,
        mimeType: sourceFile.mimeType,
        type: sourceFile.type as FileFolder,
        url: sourceFile.url,
        isEncrypted: sourceFile.isEncrypted,
        encryptedSymmetricKey: sourceFile.encryptedSymmetricKey,
        iv: sourceFile.iv,
      });

      loggerBack.info(
        `Created a copy of file ID ${fileId} for account book icon: ${clonedFileName}`
      );
    } else {
      // Info: (20250515 - Shirley) 如果沒有提供 fileId，則自動生成一個圖像
      const companyIcon = await generateIcon(name);
      const imageName = name + '_icon' + nowInSecond;
      file = await createFile({
        name: imageName,
        size: companyIcon.size,
        mimeType: companyIcon.mimeType,
        type: FileFolder.TMP,
        url: companyIcon.iconUrl,
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });
      loggerBack.info(`Generated new icon for account book: ${imageName}`);
    }

    if (!file) {
      const error = new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
      error.name = STATUS_CODE.INTERNAL_SERVICE_ERROR;
      throw error;
    }

    if (teamId) {
      const hasPermission = await isEligibleToCreateAccountBookInTeam(userId, teamId);
      if (!hasPermission) {
        const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
        error.name = STATUS_CODE.PERMISSION_DENIED;
        throw error;
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
    await checkAccountBookLimit(teamId);

    // Info: (20250506 - Shirley) Using transaction to create account book and company setting together
    const result = await transaction(async (tx) => {
      const createdAccountBook = await tx.company.create({
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
          imageFile: true,
        },
      });

      // Info: (20250515 - Shirley) 使用 JSON 格式的地址
      const addressJson = {
        city: city || '',
        district: district || '',
        enteredAddress: enteredAddress || '',
      };

      const companySetting = await tx.companySetting.create({
        data: {
          companyId: createdAccountBook.id,
          taxSerialNumber: taxSerialNumber || '',
          representativeName: representativeName || '',
          country: '',
          phone: phoneNumber || '',
          address: addressJson,
          countryCode: 'tw',
          contactPerson: contactPerson || '',
          filingFrequency,
          filingMethod,
          declarantFilingMethod,
          declarantName,
          declarantPersonalId,
          declarantPhoneNumber,
          agentFilingRole,
          licenseId,
          createdAt: nowInSecond,
          updatedAt: nowInSecond,
        },
      });

      await tx.accountingSetting.create({
        data: {
          companyId: createdAccountBook.id,
          salesTaxTaxable: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_TAXABLE,
          salesTaxRate: DEFAULT_ACCOUNTING_SETTING.SALES_TAX_RATE,
          purchaseTaxTaxable: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_TAXABLE,
          purchaseTaxRate: DEFAULT_ACCOUNTING_SETTING.PURCHASE_TAX_RATE,
          returnPeriodicity: DEFAULT_ACCOUNTING_SETTING.RETURN_PERIODICITY,
          currency: DEFAULT_ACCOUNTING_SETTING.CURRENCY,
          createdAt: nowInSecond,
          updatedAt: nowInSecond,
        },
      });

      return {
        accountBook: createdAccountBook,
        companySetting,
      };
    });

    const { accountBook: createdAccountBook } = result;

    accountBook = {
      ...createdAccountBook,
      ...body,
      imageId: createdAccountBook.imageFile?.url ?? '/images/fake_company_img.svg',
    };

    // Info: (20250124 - Shirley) Step 4.
    const companyKeyPair = await generateKeyPair();
    await storeKeyByCompany(createdAccountBook.id, companyKeyPair);
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
      // Info: (20250517 - Shirley) 添加 companySettings 以獲取更多欄位
      companySettings: {
        where: {
          deletedAt: null,
        },
        take: 1,
      },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption),
  });

  // Info: (20250337 - Tzuhan) 格式化回傳數據
  const result = toPaginatedData({
    data: accountBooks.map((book) => {
      const teamMember = book.team?.members.find((member) => member.userId === userId);
      const teamRole = (teamMember?.role ?? TeamRole.VIEWER) as TeamRole;
      const expiredAt = book.team?.subscriptions[0]?.expiredDate ?? 0;
      const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);

      // Info: (20250516 - Shirley) 獲取 companySetting 欄位，如果不存在則提供默認值
      const setting = book.companySettings?.[0] || {};
      const address = setting.address
        ? typeof setting.address === 'string'
          ? JSON.parse(setting.address)
          : setting.address
        : { city: '', district: '', enteredAddress: '' };

      return {
        id: book.id,
        teamId: book.teamId,
        userId: book.userId,
        imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
        name: book.name,
        taxId: book.taxId,
        startDate: book.startDate,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        isPrivate: book.isPrivate ?? false,
        tag: book.tag as WORK_TAG,

        // Info: (20250517 - Shirley) 添加 CompanySetting 欄位
        representativeName: setting.representativeName || '',
        taxSerialNumber: setting.taxSerialNumber || '',
        contactPerson: setting.contactPerson || '',
        phoneNumber: setting.phone || '',
        city: address.city || '',
        district: address.district || '',
        enteredAddress: address.enteredAddress || '',

        // Info: (20250517 - Shirley) 添加選填欄位
        filingFrequency: setting.filingFrequency,
        filingMethod: setting.filingMethod,
        declarantFilingMethod: setting.declarantFilingMethod,
        declarantName: setting.declarantName,
        declarantPersonalId: setting.declarantPersonalId,
        declarantPhoneNumber: setting.declarantPhoneNumber,
        agentFilingRole: setting.agentFilingRole,
        licenseId: setting.licenseId,

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
              expiredAt,
              inGracePeriod,
              gracePeriodEndAt,
            }
          : null,
        isTransferring: book.isTransferring,
      } as IAccountBookWithTeam;
    }),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });

  return result;
};

/**
 * Info: (20250515 - Shirley) 獲取用戶的帳本列表（簡化版，不包含 companySetting 資料）
 * @param userId 用戶ID
 * @param queryParams 查詢參數，包含分頁、排序、搜索等選項
 * @returns 分頁後的帳本列表
 */
export const listSimpleAccountBookByUserId = async (
  userId: number,
  queryParams: {
    page?: number;
    pageSize?: number;
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
  }
): Promise<IPaginatedOptions<IAccountBookSimple[]>> => {
  const {
    page = 1,
    pageSize = 10,
    startDate = 0,
    endDate = Math.floor(Date.now() / 1000),
    searchQuery = '',
    sortOption = [{ sortBy: SortBy.CREATED_AT, sortOrder: SortOrder.DESC }],
  } = queryParams;

  // Info: (20250515 - Shirley) 查詢用戶所屬的所有團隊
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

  // Info: (20250515 - Shirley) 查詢團隊內的所有帳本總數
  const totalCount = await prisma.company.count({
    where: {
      teamId: { in: teamIds },
      name: searchQuery ? { contains: searchQuery, mode: 'insensitive' } : undefined,
      createdAt: { gte: startDate, lte: endDate },
      AND: [{ OR: [{ deletedAt: 0 }, { deletedAt: null }] }],
    },
  });

  const nowInSecond = getTimestampNow();

  // Info: (20250515 - Shirley) 取得帳本基本資訊，包含所屬團隊
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
      // 不包含 companySettings 資料
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: createOrderByList(sortOption),
  });

  // Info: (20250515 - Shirley) 格式化回傳數據
  const result = toPaginatedData({
    data: accountBooks.map((book) => {
      const teamMember = book.team?.members.find((member) => member.userId === userId);
      const teamRole = (teamMember?.role ?? TeamRole.VIEWER) as TeamRole;
      const expiredAt = book.team?.subscriptions[0]?.expiredDate ?? 0;
      const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);

      return {
        id: book.id,
        teamId: book.teamId,
        userId: book.userId,
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
              expiredAt,
              inGracePeriod,
              gracePeriodEndAt,
            }
          : null,
        isTransferring: book.isTransferring,
      } as IAccountBookWithTeam;
    }),
    page,
    totalPages: Math.ceil(totalCount / pageSize),
    totalCount,
    pageSize,
    sort: sortOption,
  });

  return result;
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
        // Info: (20250517 - Shirley) 添加 companySettings 以獲取更多欄位
        companySettings: {
          where: {
            deletedAt: null,
          },
          take: 1,
        },
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
      const expiredAt = book.team.subscriptions[0]?.expiredDate ?? 0;
      const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);

      // Info: (20250517 - Shirley) 獲取 companySetting 欄位，如果不存在則提供默認值
      const setting = book.companySettings?.[0] || {};
      const address = setting.address
        ? typeof setting.address === 'string'
          ? JSON.parse(setting.address)
          : setting.address
        : { city: '', district: '', enteredAddress: '' };

      return {
        id: book.id,
        teamId: book.teamId,
        userId: book.userId,
        imageId: book.imageFile?.url ?? '/images/fake_company_img.svg',
        name: book.name,
        taxId: book.taxId,
        startDate: book.startDate,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
        isPrivate: book.isPrivate ?? false,
        tag: book.tag as WORK_TAG, // ✅ (20250324 - Tzuhan) 直接取用 tag

        // Info: (20250517 - Shirley) 添加 CompanySetting 欄位
        representativeName: setting.representativeName || '',
        taxSerialNumber: setting.taxSerialNumber || '',
        contactPerson: setting.contactPerson || '',
        phoneNumber: setting.phone || '',
        city: address.city || '',
        district: address.district || '',
        enteredAddress: address.enteredAddress || '',

        // Info: (20250516 - Shirley) 添加選填欄位
        filingFrequency: setting.filingFrequency,
        filingMethod: setting.filingMethod,
        declarantFilingMethod: setting.declarantFilingMethod,
        declarantName: setting.declarantName,
        declarantPersonalId: setting.declarantPersonalId,
        declarantPhoneNumber: setting.declarantPhoneNumber,
        agentFilingRole: setting.agentFilingRole,
        licenseId: setting.licenseId,

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
              expiredAt,
              inGracePeriod,
              gracePeriodEndAt,
            }
          : null,
        isTransferring: book.isTransferring,
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
  const now = getTimestampNow();

  const { can } = await assertUserCan({
    userId,
    teamId: fromTeamId,
    action: TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }

  const accountBook = await prisma.company.findFirst({
    where: { id: accountBookId, teamId: fromTeamId },
  });
  if (!accountBook) {
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_NOT_FOUND);
    error.name = STATUS_CODE.ACCOUNT_BOOK_NOT_FOUND;
    throw error;
  }
  if (accountBook.isTransferring) {
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_ALREADY_TRANSFERRING);
    error.name = STATUS_CODE.ACCOUNT_BOOK_ALREADY_TRANSFERRING;
    throw error;
  }

  const [fromTeam, toTeam] = await Promise.all([
    prisma.team.findUnique({
      where: { id: fromTeamId },
      include: {
        subscriptions: {
          where: { startDate: { lte: now }, expiredDate: { gt: now } },
          include: { plan: true },
        },
      },
    }),
    prisma.team.findUnique({
      where: { id: toTeamId },
      include: {
        subscriptions: {
          where: { startDate: { lte: now }, expiredDate: { gt: now } },
          include: { plan: true },
        },
      },
    }),
  ]);
  if (!toTeam || !fromTeam) {
    const error = new Error(STATUS_MESSAGE.TEAM_NOT_FOUND);
    error.name = STATUS_CODE.TEAM_NOT_FOUND;
    throw error;
  }

  if (!fromTeam.subscriptions.length || !toTeam.subscriptions.length) {
    const error = new Error(STATUS_MESSAGE.TEAM_PLAN_INVALID);
    error.name = STATUS_CODE.TEAM_PLAN_INVALID;
    throw error;
  }

  const targetPlan = toTeam.subscriptions[0]?.planType || TPlanType.BEGINNER;
  const toTeamAccountBookCount = await prisma.company.count({ where: { teamId: toTeamId } });

  if (toTeamAccountBookCount >= SUBSCRIPTION_PLAN_LIMITS[targetPlan]) {
    const error = new Error(STATUS_MESSAGE.EXCEED_PLAN_LIMIT);
    error.name = STATUS_CODE.EXCEED_PLAN_LIMIT;
    throw error;
  }

  await prisma.$transaction([
    prisma.accountBookTransfer.create({
      data: {
        companyId: accountBookId,
        fromTeamId,
        toTeamId,
        initiatedByUserId: userId,
        status: TransferStatus.COMPLETED, // Info: (20250313 - Tzuhan) 目前因為通知系統還沒有做好，所以直接設定為 COMPLETED
        // pendingAt: now,
      },
    }),
    // Info: (20250311 - Tzuhan) 更新帳本 `isTransferring = true`
    /** Info: (20250313 - Tzuhan) 目前因為通知系統還沒有做好，所以跟邀請member一樣，這邊對方都不會收到確認通知，會直接轉移成功
  await prisma.company.update({
    where: { id: accountBookId },
    data: { isTransferring: true },
  });
  */
  ]);

  return {
    accountBookId,
    fromTeamId,
    toTeamId,
    status: TransferStatus.COMPLETED, // Info: (20250313 - Tzuhan) 目前因為通知系統還沒有做好，所以直接設定為 COMPLETED
  };
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
    const error = new Error(STATUS_MESSAGE.TRANSFER_RECORD_NOT_FOUND);
    error.name = STATUS_CODE.TRANSFER_RECORD_NOT_FOUND;
    throw error;
  } else if (transfer.status !== TransferStatus.PENDING) {
    const error = new Error(STATUS_MESSAGE[`TRANSFER_RECORD_IS_${transfer.status}`]);
    error.name = STATUS_CODE[`TRANSFER_RECORD_IS_${transfer.status}`];
    throw error;
  }

  const { effectiveRole, can } = await assertUserCan({
    userId,
    teamId: transfer.fromTeamId,
    action: TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER,
  });

  if (!effectiveRole || !can) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }

  const accountBook = await prisma.company.findFirst({
    where: { id: accountBookId, teamId: transfer.fromTeamId },
  });
  if (!accountBook) {
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_NOT_FOUND);
    error.name = STATUS_CODE.ACCOUNT_BOOK_NOT_FOUND;
    throw error;
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
  const now = getTimestampNow();

  const transfer = await prisma.accountBookTransfer.findFirst({
    where: { companyId: accountBookId, status: TransferStatus.PENDING },
  });
  if (!transfer) {
    const error = new Error(STATUS_MESSAGE.TRANSFER_RECORD_NOT_FOUND);
    error.name = STATUS_CODE.TRANSFER_RECORD_NOT_FOUND;
    throw error;
  }

  const { can } = await assertUserCan({
    userId,
    teamId: transfer.toTeamId,
    action: TeamPermissionAction.ACCEPT_ACCOUNT_BOOK_TRANSFER,
  });
  if (!can) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }

  const toTeam = await prisma.team.findUnique({
    where: { id: transfer.toTeamId },
    include: {
      subscriptions: {
        where: { startDate: { lte: now }, expiredDate: { gt: now } },
      },
    },
  });
  if (!toTeam?.subscriptions?.length) {
    const error = new Error(STATUS_MESSAGE.TEAM_PLAN_INVALID);
    error.name = STATUS_CODE.TEAM_PLAN_INVALID;
    throw error;
  }

  await prisma.$transaction([
    prisma.company.update({
      where: { id: accountBookId },
      data: { teamId: transfer.toTeamId, isTransferring: false },
    }),
    prisma.accountBookTransfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.COMPLETED,
        completedAt: now,
      },
    }),
  ]);
};

// Info: (20250314 - Tzuhan) 拒絕帳本轉移: 邏輯部分實作未檢查是否充分也還未測試
export const declineTransferAccountBook = async (
  userId: number,
  accountBookId: number
): Promise<void> => {
  const now = getTimestampNow();

  // Info: (20250311 - Tzuhan) 找到帳本的 `transfer` 記錄
  const transfer = await prisma.accountBookTransfer.findFirst({
    where: { companyId: accountBookId, status: TransferStatus.PENDING },
  });
  if (!transfer) {
    const error = new Error(STATUS_MESSAGE.TRANSFER_RECORD_NOT_FOUND);
    error.name = STATUS_CODE.TRANSFER_RECORD_NOT_FOUND;
    throw error;
  }
  // Info: (20250311 - Tzuhan) 確保用戶是 `toTeamId` 的 `Owner` 或 `Admin`
  const { can } = await assertUserCan({
    userId,
    teamId: transfer.toTeamId,
    action: TeamPermissionAction.DECLINE_ACCOUNT_BOOK_TRANSFER,
  });
  if (!can) {
    const error = new Error(STATUS_MESSAGE.FORBIDDEN);
    error.name = STATUS_CODE.FORBIDDEN;
    throw error;
  }

  // Info: (20250311 - Tzuhan) 更新 `accountBook_transfer` 狀態 & `company.isTransferring`
  await prisma.$transaction([
    prisma.accountBookTransfer.update({
      where: { id: transfer.id },
      data: {
        status: TransferStatus.DECLINED,
        updatedAt: now,
      },
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
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
        status: LeaveStatus.IN_TEAM,
      },
      select: {
        role: true,
        team: {
          select: {
            subscriptions: {
              orderBy: { expiredDate: SortOrder.DESC },
              take: 1,
              select: {
                startDate: true,
                expiredDate: true,
                plan: { select: { type: true } },
              },
            },
          },
        },
      },
    });

    if (!teamMember) return null;

    const { role, team } = teamMember;
    const expiredAt = team.subscriptions[0]?.expiredDate ?? 0;
    const nowInSecond = getTimestampNow();
    const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);
    const isExpired = expiredAt === 0 || nowInSecond > gracePeriodEndAt;
    const effectiveRole = isExpired ? TeamRole.VIEWER : (role as TeamRole);
    const planType = team.subscriptions[0]
      ? (team.subscriptions[0].plan.type as TPlanType)
      : TPlanType.BEGINNER;

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

    if (!accountBook) return null;

    const teamEntity = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { status: LeaveStatus.IN_TEAM },
          select: { id: true, userId: true, role: true },
        },
        accountBook: { select: { id: true } },
        imageFile: { select: { url: true } },
      },
    });

    if (!teamEntity) return null;

    const teamInfo: ITeam = {
      id: teamEntity.id,
      imageId: teamEntity.imageFile?.url ?? '/images/fake_team_img.svg',
      role: effectiveRole,
      name: { value: teamEntity.name, editable: effectiveRole !== TeamRole.VIEWER },
      about: { value: teamEntity.about ?? '', editable: effectiveRole !== TeamRole.VIEWER },
      profile: { value: teamEntity.profile ?? '', editable: effectiveRole !== TeamRole.VIEWER },
      planType: { value: planType, editable: false },
      totalMembers: teamEntity.members.length,
      totalAccountBooks: teamEntity.accountBook.length,
      bankAccount: {
        value: teamEntity.bankInfo
          ? `${(teamEntity.bankInfo as { code: string }).code}-${(teamEntity.bankInfo as { number: string }).number}`
          : '',
        editable: effectiveRole !== TeamRole.VIEWER,
      },
      expiredAt,
      inGracePeriod,
      gracePeriodEndAt,
    };

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
      tag: WORK_TAG.ALL,
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
  if (userId <= 0 || companyId <= 0) return null;

  const nowInSecond = getTimestampNow();
  const THREE_DAYS = 3 * 24 * 60 * 60;

  try {
    const accountBook = await prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
        team: {
          members: {
            some: {
              userId,
              status: LeaveStatus.IN_TEAM,
            },
          },
          ...(teamIds && teamIds.length > 0 ? { id: { in: teamIds } } : {}),
        },
      },
      include: {
        imageFile: true,
        team: {
          include: {
            members: {
              where: { userId, status: LeaveStatus.IN_TEAM },
              select: { role: true },
            },
            subscriptions: {
              where: {
                startDate: { lte: nowInSecond },
                expiredDate: { gt: nowInSecond - THREE_DAYS }, // 保留寬限期
              },
              orderBy: { expiredDate: SortOrder.DESC },
              take: 1,
              include: { plan: true },
            },
            imageFile: { select: { id: true, url: true } },
          },
        },
      },
    });

    if (!accountBook || !accountBook.team) return null;

    const { team } = accountBook;
    const userRole = team.members[0]?.role ?? TeamRole.VIEWER;

    const expiredAt = team.subscriptions[0]?.expiredDate ?? 0;
    const { inGracePeriod, gracePeriodEndAt } = getGracePeriodInfo(expiredAt);
    const isExpired = expiredAt === 0 || nowInSecond > gracePeriodEndAt;
    const effectiveRole = isExpired ? TeamRole.VIEWER : (userRole as TeamRole);

    const planType = team.subscriptions[0]
      ? (team.subscriptions[0].plan.type as TPlanType)
      : TPlanType.BEGINNER;

    const [totalAccountBooks, totalMembers] = await Promise.all([
      prisma.company.count({
        where: {
          teamId: team.id,
          OR: [{ deletedAt: 0 }, { deletedAt: null }],
        },
      }),
      prisma.teamMember.count({
        where: {
          teamId: team.id,
          status: LeaveStatus.IN_TEAM,
        },
      }),
    ]);

    const teamInfo: ITeam = {
      id: team.id,
      imageId: team.imageFile?.url ?? '/images/fake_team_img.svg',
      role: effectiveRole,
      name: { value: team.name, editable: effectiveRole !== TeamRole.VIEWER },
      about: { value: team.about || '', editable: effectiveRole !== TeamRole.VIEWER },
      profile: { value: team.profile || '', editable: effectiveRole !== TeamRole.VIEWER },
      planType: { value: planType, editable: false },
      totalMembers,
      totalAccountBooks,
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
      tag: WORK_TAG.ALL,
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

  loggerBack.info(
    `User ${userId} is updating account book ${accountBookId} with data: ${JSON.stringify({
      name,
      tag,
      taxId,
      teamId,
    })}`
  );

  const accountBook = await prisma.company.findFirst({
    where: {
      id: accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  if (!accountBook) {
    loggerBack.warn(`Account book ${accountBookId} not found`);
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_NOT_FOUND);
    error.name = STATUS_CODE.ACCOUNT_BOOK_NOT_FOUND;
    throw error;
  }

  try {
    const updatedAccountBook = await prisma.company.update({
      where: { id: accountBookId },
      data: {
        name,
        tag, // Info: (20250418 - Shirley) tag 是 Tag 枚舉類型，與 WORK_TAG 枚舉相匹配
        taxId,
        teamId,
        updatedAt: getTimestampNow(),
      },
      include: {
        imageFile: true,
      },
    });

    if (updatedAccountBook) {
      const imageUrl = updatedAccountBook.imageFile?.url ?? '/images/fake_company_img.svg';

      // Info: (20250411 - Shirley) 創建標準 accountBookSchema 格式的 company 對象
      const companyWithImageId = {
        id: updatedAccountBook.id,
        teamId: updatedAccountBook.teamId,
        userId: updatedAccountBook.userId,
        imageId: imageUrl,
        name: updatedAccountBook.name,
        taxId: updatedAccountBook.taxId,
        tag: updatedAccountBook.tag as WORK_TAG,
        startDate: updatedAccountBook.startDate,
        createdAt: updatedAccountBook.createdAt,
        updatedAt: updatedAccountBook.updatedAt,
        isPrivate: updatedAccountBook.isPrivate ?? false,
      };

      // Info: (20250411 - Shirley) 根據 updateAccountBookResponseSchema 結構組織返回數據
      result = {
        ...updatedAccountBook,
        teamId: updatedAccountBook.teamId,
        imageId: imageUrl,
        tag: updatedAccountBook.tag as WORK_TAG,
        company: companyWithImageId,
        order: 1,
        accountBookRole: ACCOUNT_BOOK_ROLE.COMPANY,
      } as IAccountBook & {
        company: typeof companyWithImageId;
        order: number;
        accountBookRole: ACCOUNT_BOOK_ROLE;
      };
      loggerBack.info(`Successfully updated account book ${accountBookId}`);
    }
  } catch (error) {
    loggerBack.error({
      error,
      accountBookId,
      userId,
      body,
      message: 'Failed to update account book',
    });
    throw error;
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
    const error = new Error(STATUS_MESSAGE.ACCOUNT_BOOK_NOT_FOUND);
    error.name = STATUS_CODE.ACCOUNT_BOOK_NOT_FOUND;
    throw error;
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

/**
 * Info: (20250409 - Shirley) 獲取帳本所屬的團隊ID
 * @param accountBookId 帳本ID
 * @returns 帳本所屬的團隊ID，如果找不到則返回null
 */
export const getAccountBookTeamId = async (accountBookId: number): Promise<number | null> => {
  try {
    const accountBook = await prisma.company.findFirst({
      where: {
        id: accountBookId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
      select: {
        teamId: true,
      },
    });

    return accountBook?.teamId || null;
  } catch (error) {
    loggerBack.error({
      error,
      accountBookId,
      message: 'Failed to get account book team ID',
    });
    return null;
  }
};
