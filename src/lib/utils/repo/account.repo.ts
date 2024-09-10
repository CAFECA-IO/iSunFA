import { AccountType, EQUITY_TYPE_TO_CODE_MAP, EquityType } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import prisma from '@/client';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Account, Prisma } from '@prisma/client';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { ReportSheetAccountTypeMap, ReportSheetType } from '@/constants/report';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';

export async function findManyAccountsInPrisma({
  companyId,
  includeDefaultAccount,
  liquidity,
  type,
  reportType,
  equityType,
  forUser,
  isDeleted,
  page = DEFAULT_PAGE_OFFSET,
  limit = DEFAULT_PAGE_LIMIT,
  sortBy = 'code',
  sortOrder = SortOrder.ASC,
  searchKey,
}: {
  companyId: number;
  includeDefaultAccount?: boolean;
  liquidity?: boolean;
  type?: AccountType;
  reportType?: ReportSheetType;
  equityType?: EquityType;
  forUser?: boolean;
  isDeleted?: boolean;
  page: number;
  limit: number;
  sortBy: 'code' | 'createdAt';
  sortOrder: SortOrder.ASC | SortOrder.DESC;
  searchKey?: string;
}): Promise<{
  data: Account[];
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sortOrder: SortOrder.ASC | SortOrder.DESC;
  sortBy: 'code' | 'createdAt';
}> {
  let accounts: Account[] = [];

  const accountTypes = reportType ? ReportSheetAccountTypeMap[reportType] : [];
  const where: Prisma.AccountWhereInput = {
    liquidity,

    forUser,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    AND: [
      {
        OR: type ? [{ type }] : accountTypes.length > 0 ? [{ type: { in: accountTypes } }] : [],
      },
      {
        OR:
          includeDefaultAccount !== undefined
            ? includeDefaultAccount
              ? [{ companyId }, { companyId: PUBLIC_COMPANY_ID }]
              : [{ companyId }]
            : [],
      },
      equityType && type === AccountType.EQUITY
        ? {
            code: {
              in: EQUITY_TYPE_TO_CODE_MAP[equityType],
            },
          }
        : {},
      {
        OR: searchKey
          ? [
              { name: { contains: searchKey, mode: 'insensitive' } },
              { code: { contains: searchKey, mode: 'insensitive' } },
            ]
          : [],
      },
    ],
  };

  let totalCount = 0;

  try {
    totalCount = await prisma.account.count({ where });
  } catch (error) {
    const logError = loggerError(
      0,
      'Count tototal count of account in findManyAccountsInPrisma failed',
      error as Error
    );
    logError.error('Prisma count account in account.repo.ts failed');
  }

  const totalPage = Math.ceil(totalCount / limit);

  const offset = pageToOffset(page, limit);
  const orderBy = { [sortBy]: sortOrder };
  const include = {};
  const findManyArgs = {
    skip: offset,
    take: limit + 1,
    orderBy,
    include,
    where,
  };

  try {
    accounts = await prisma.account.findMany(findManyArgs);
  } catch (error) {
    const logError = loggerError(
      0,
      'Find many accounts in findManyAccountsInPrisma failed',
      error as Error
    );
    logError.error('Prisma find many accounts in account.repo.ts failed');
  }

  const hasNextPage = accounts.length > limit;
  const hasPreviousPage = page > DEFAULT_PAGE_NUMBER; // 1;

  if (hasNextPage) {
    accounts.pop();
  }

  const returnValue = {
    data: accounts,
    page,
    limit,
    totalPage,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    sortOrder,
    sortBy,
  };

  return returnValue;
}

export async function findFirstAccountInPrisma(accountId: number, companyId: number) {
  let account: Account | null = null;
  try {
    account = await prisma.account.findFirst({
      where: {
        id: accountId,
        OR: [
          {
            companyId,
          },
          {
            companyId: PUBLIC_COMPANY_ID,
          },
        ],
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'Find first account in findFirstAccountInPrisma failed',
      error as Error
    );
    logError.error('Prisma find first account in account.repo.ts failed');
  }

  return account;
}

export async function updateAccountInPrisma(
  accountIdNumber: number,
  companyIdNumber: number,
  name: string
) {
  let account: Account | null = null;
  try {
    account = await prisma.account.update({
      where: {
        id: accountIdNumber,
        companyId: companyIdNumber,
      },
      data: {
        name,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'Update account in updateAccountInPrisma failed',
      error as Error
    );
    logError.error('Prisma update account in account.repo.ts failed');
  }

  return account;
}

export async function softDeleteAccountInPrisma(accountIdNumber: number, companyIdNumber: number) {
  let account: Account | null = null;
  const time = new Date().getTime();
  const timeInSeconds = timestampInSeconds(time);
  try {
    account = await prisma.account.update({
      where: {
        id: accountIdNumber,
        companyId: companyIdNumber,
      },
      data: {
        deletedAt: timeInSeconds,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'Soft delete account in softDeleteAccountInPrisma failed',
      error as Error
    );
    logError.error('Prisma soft delete account in account.repo.ts failed');
  }
  return account;
}

export async function findLatestSubAccountInPrisma(parentAccount: Account) {
  let latestSubAccount: Account | null = null;
  try {
    latestSubAccount = await prisma.account.findFirst({
      where: {
        parentCode: parentAccount.code,
      },
      orderBy: {
        createdAt: SortOrder.DESC,
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'Find latest sub account in findLatestSubAccountInPrisma failed',
      error as Error
    );
    logError.error('Prisma find latest sub account in account.repo.ts failed');
  }
  return latestSubAccount;
}

export async function easyFindManyAccountsInPrisma(companyId: number, type: AccountType) {
  const accounts: Account[] = await prisma.account.findMany({
    where: {
      OR: [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
      type,
    },
  });
  return accounts;
}

export async function findUniqueAccountByCodeInPrisma(code: string, companyId?: number) {
  const account: Account | null = await prisma.account.findUnique({
    where: {
      OR: [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
      code,
    },
  });
  return account;
}

export async function fuzzySearchAccountByName(name: string) {
  let account: Account | null = null;

  try {
    const accounts: Account[] = await prisma.$queryRaw`
      SELECT * FROM public."account"
      WHERE for_user = true
      ORDER BY SIMILARITY(name, ${name}) DESC
      LIMIT 1;
    `;
    [account] = accounts;
  } catch (error) {
    const logError = loggerError(
      0,
      'Fuzzy search account by name in fuzzySearchAccountByName failed',
      error as Error
    );
    logError.error('Prisma fuzzy search account by name in account.repo.ts failed');
  }

  return account;
}
