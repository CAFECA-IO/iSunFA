import { AccountType, EQUITY_TYPE_TO_CODE_MAP, EquityType } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import prisma from '@/client';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Account, Prisma } from '@prisma/client';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { ReportSheetAccountTypeMap, ReportSheetType } from '@/constants/report';

export async function findManyAccountsInPrisma({
  companyId,
  includeDefaultAccount,
  liquidity,
  type,
  reportType,
  equityType,
  forUser = true,
  isDeleted,
  page = DEFAULT_PAGE_OFFSET,
  limit = DEFAULT_PAGE_LIMIT,
  sortBy = 'code',
  sortOrder = 'asc',
  searchKey,
}:{
  companyId: number,
  includeDefaultAccount?: boolean,
  liquidity?: boolean,
  type?: AccountType,
  reportType?: ReportSheetType,
  equityType?: EquityType,
  forUser?: boolean,
  isDeleted?: boolean,
  page: number,
  limit: number,
  sortBy: 'code' | 'createdAt',
  sortOrder: 'asc' | 'desc',
  searchKey?: string,
}): Promise<{
  data: Account[],
  page: number,
  limit: number,
  totalPage: number,
  totalCount: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  sortOrder: 'asc' | 'desc',
  sortBy: 'code' | 'createdAt',
}> {
  let accounts: Account[] = [];

  const accountTypes = reportType ? ReportSheetAccountTypeMap[reportType] : [];
  const where: Prisma.AccountWhereInput = {
    liquidity,

    forUser,
    deletedAt: isDeleted ? { not: null } : isDeleted === false ? null : undefined,
    AND: [

      {
        OR: type
          ? [{ type }]
          : accountTypes.length > 0
            ? [{ type: { in: accountTypes, }, }]
            : [],
      },
      {
        OR: includeDefaultAccount !== undefined
          ? includeDefaultAccount
            ? [{ companyId }, { companyId: PUBLIC_COMPANY_ID },]
            : [{ companyId }]
          : [],
      },
      type === AccountType.EQUITY && equityType ? {
        code: {
          in: EQUITY_TYPE_TO_CODE_MAP[equityType],
        },
      } : {},
      {
        OR: searchKey
          ? [
            { name: { contains: searchKey, mode: 'insensitive' } },
            { code: { contains: searchKey, mode: 'insensitive' } },
          ]
          : [],
      }
    ],
  };

  let totalCount = 0;

  try {
    totalCount = await prisma.account.count({ where });
  } catch (error) {
    // Info (20240722 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Info (20240722 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Info (20240516 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Info (20240702 - Gibbs) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Info (20240702 - Gibbs) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return account;
}

export async function findLatestSubAccountInPrisma(
  companyIdNumber: number,
  parentAccount: Account
) {
  let latestSubAccount: Account | null = null;
  try {
    latestSubAccount = await prisma.account.findFirst({
      where: {
        companyId: companyIdNumber,
        parentCode: parentAccount.code,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error) {
    // Info (20240703 - Gibbs) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return latestSubAccount;
}
