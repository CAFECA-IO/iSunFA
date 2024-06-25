import { timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItem } from '@/interfaces/line_item';
import { AccountSystem, AccountType } from '@/constants/account';
import { PUBLIC_COMPANY_ID } from '@/constants/company';

export async function findUniqueJournalInPrisma(journalId: number | undefined) {
  try {
    const result = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      select: {
        id: true,
      },
    });

    if (!result) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findFirstAccountByNameInPrisma(accountName: string) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        name: accountName,
      },
      select: {
        id: true,
      },
    });

    return result?.id || null;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findFirstAccountBelongsToCompanyInPrisma(id: string, companyId: number) {
  try {
    const result = await prisma.account.findFirst({
      where: {
        id: Number(id),
        OR: [
          {
            company: {
              id: companyId,
            },
          },
          {
            company: {
              id: PUBLIC_COMPANY_ID,
            },
          },
        ]
      }
    });

    return result;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findUniqueVoucherInPrisma(voucherId: number) {
  let voucherData:{
    id: number;
    createdAt: number;
    updatedAt: number;
    journalId: number;
    no: string;
    lineItems: {
        id: number;
        amount: number;
        description: string;
        debit: boolean;
        accountId: number;
        voucherId: number;
        createdAt: number;
        updatedAt: number;
    }[];
  } | null = null;
  try {
    voucherData = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      select: {
        id: true,
        journalId: true,
        no: true,
        createdAt: true,
        updatedAt: true,
        lineItems: true,
      },
    });
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return voucherData;
}

// Deprecated: (20240527 - Murky) This function is for demo purpose only
export async function createFakeAccountInPrisma(companyId: number) {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  try {
    const result = await prisma.account.create({
      data: {
        company: {
          connect: {
            id: companyId,
          },
        },
        system: AccountSystem.IFRS,
        type: AccountType.EXPENSE,
        debit: true,
        liquidity: true,
        code: '0100032',
        name: '其他費用',
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },

      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function createLineItemInPrisma(lineItem: ILineItem, voucherId: number, companyId: number) {
  try {
    // Deprecated: (20240527 - Murky) LineItem has accountId
    // let accountId = await findFirstAccountInPrisma(lineItem.account);

    // Deprecated: (20240527 - Murky) LineItem has accountId
    // if (!accountId) {
    //   accountId = await findFirstAccountInPrisma('其他費用');
    //   if (!accountId) {
    //     accountId = await createFakeAccountInPrisma(companyId);
    //   }
    // }

    // Deprecated: (20240619 - Murky) LineItem has accountId, no need to check
    if (!lineItem.accountId) {
      // Deprecated: (20240527 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`LineItem ${lineItem.account} does not have accountId`);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    const accountBelongsToCompany = await findFirstAccountBelongsToCompanyInPrisma(String(lineItem.accountId), companyId);

    if (!accountBelongsToCompany) {
      // Deprecated: (20240527 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(`LineItem ${lineItem.account} does not belong to company ${companyId}`);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const result = await prisma.lineItem.create({
      data: {
        amount: lineItem.amount,
        description: lineItem.description,
        debit: lineItem.debit,
        account: {
          connect: {
            id: lineItem.accountId,
          },
        },
        voucher: {
          connect: {
            id: voucherId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
      },
    });

    return result.id;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export async function getLatestVoucherNoInPrisma(companyId: number) {
  try {
    const result = await prisma.voucher.findFirst({
      where: {
        journal: {
          companyId,
        },
      },
      orderBy: {
        no: 'desc',
      },
      select: {
        no: true,
        createdAt: true,
      },
    });

    const localToday = `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()}`;
    const localTodayStrip = localToday.replace(/\//g, '');

    const resultDate = result?.createdAt ? new Date(timestampInSeconds(result?.createdAt)).getDate() : -1;
    const isYesterday = resultDate !== new Date().getDate();
    const latestNo = result?.no.slice(result.no.length - 3) || '0'; // Info: （ 20240522 - Murky）I want to slice the last 3 digits
    const newVoucherNo = isYesterday ? '001' : String(Number(latestNo) + 1).padStart(3, '0');

    return `${localTodayStrip}${newVoucherNo}`;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function createVoucherInPrisma(
  newVoucherNo: string,
  journalId: number,
) {
  try {
    const now = Date.now();
    const nowTimestamp = timestampInSeconds(now);
    const voucherData = await prisma.voucher.create({
      data: {
        no: newVoucherNo,
        journal: {
          connect: {
            id: journalId,
          },
        },
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      },
      select: {
        id: true,
        lineItems: true,
      },
    });

    return voucherData;
  } catch (error) {
    // Info: （ 20240522 - Murky）I want to log the error message
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}
