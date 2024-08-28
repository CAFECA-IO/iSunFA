import { AccountType, EQUITY_TYPE_TO_CODE_MAP, EquityType } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import prisma from '@/client';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Account, Prisma } from '@prisma/client';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { ReportSheetAccountTypeMap, ReportSheetType } from '@/constants/report';
import logger from '@/lib/utils/logger';

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
  sortOrder = 'asc',
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
  sortOrder: 'asc' | 'desc';
  searchKey?: string;
}): Promise<{
  data: Account[];
  page: number;
  limit: number;
  totalPage: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  sortOrder: 'asc' | 'desc';
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
        createdAt: 'desc',
      },
    });
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
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
    logger.error(error);
  }

  return account;
}
