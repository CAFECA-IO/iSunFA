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
import { DefaultValue } from '@/constants/default_value';

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
            : [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
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
              { code: { startsWith: searchKey, mode: 'insensitive' } },
            ]
          : [],
      },
    ],
  };

  let totalCount = 0;

  try {
    totalCount = await prisma.account.count({ where });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Count total count of account in findManyAccountsInPrisma failed',
      errorMessage: error as Error,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find many accounts in findManyAccountsInPrisma failed',
      errorMessage: error as Error,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find first account in findFirstAccountInPrisma failed',
      errorMessage: error as Error,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Update account in updateAccountInPrisma failed',
      errorMessage: error as Error,
    });
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Soft delete account in softDeleteAccountInPrisma failed',
      errorMessage: error as Error,
    });
  }
  return account;
}

export async function findLatestSubAccountInPrisma(parentAccount: Account) {
  let latestSubAccount: Account | null = null;
  try {
    latestSubAccount = await prisma.account.findFirst({
      where: {
        parentId: parentAccount.id,
      },
      orderBy: {
        createdAt: SortOrder.DESC,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Find latest sub account in findLatestSubAccountInPrisma failed',
      errorMessage: error as Error,
    });
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

// TODO: (20241126 - Shirley) FIXME: account code 可能重複，要改用 account id 找
export async function findFirstAccountByCodeInPrisma(code: string, companyId?: number) {
  const account: Account | null = await prisma.account.findFirst({
    where: {
      OR: [{ companyId }, { companyId: PUBLIC_COMPANY_ID }],
      code,
    },
  });
  return account;
}

export async function findAccountByIdInPrisma(accountId: number) {
  const account: Account | null = await prisma.account.findUnique({
    where: {
      id: accountId,
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Fuzzy search account by name in fuzzySearchAccountByName failed',
      errorMessage: error as Error,
    });
  }

  return account;
}

export async function createAccountInPrisma(options: {
  nowInSecond: number;
  companyId: number;
  system: string;
  type: string;
  debit: boolean;
  liquidity: boolean;
  code: string;
  name: string;
  forUser: boolean;
  parentCode: string;
  rootCode: string;
  level: number;
  parentId: number;
  rootId: number;
  note: string | null;
}) {
  const {
    companyId,
    system,
    type,
    debit,
    liquidity,
    code,
    name,
    forUser,
    parentCode,
    rootCode,
    level,
    parentId,
    rootId,
    note,
    nowInSecond,
  } = options;
  let account: Account | null = null;
  try {
    account = await prisma.account.create({
      data: {
        companyId,
        system,
        type,
        debit,
        liquidity,
        code,
        name,
        forUser,
        parentCode,
        rootCode,
        level,
        parentId,
        rootId,
        note,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
      },
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Create account in createAccountInPrisma failed',
      errorMessage: error as Error,
    });
  }
  return account;
}
