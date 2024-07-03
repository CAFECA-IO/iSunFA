import { AccountType } from '@/constants/account';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import prisma from '@/client';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Account } from '@prisma/client';

export async function findManyAccountsInPrisma(
  companyId: number,
  onlyForUser: boolean = true,
  page: number = DEFAULT_PAGE_OFFSET,
  limit: number = DEFAULT_PAGE_LIMIT,
  type?: AccountType,
  liquidity?: boolean,
  selectDeleted: boolean = false
): Promise<Account[]> {
  let accounts: Account[] = [];

  try {
    const offset = pageToOffset(page, limit);
    accounts = await prisma.account.findMany({
      skip: offset,
      take: limit,
      orderBy: [
        {
          code: 'asc',
        },
      ],
      where: {
        type,
        liquidity,
        forUser: onlyForUser ? true : undefined,
        OR: [
          {
            companyId,
          },
          {
            companyId: PUBLIC_COMPANY_ID,
          },
        ],
        // Info: (20240701 - Murky) 根據 selectDeleted 設置 deletedAt 的篩選條件
        deletedAt: selectDeleted ? { not: null } : null,
      },
    });
  } catch (error) {
    // Info (20240516 - Murky) - Debugging error
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return accounts;
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
