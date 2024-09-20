import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { ILineItem } from '@/interfaces/line_item';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import {
  IVoucherDataForSavingToDB,
  IVoucherFromPrismaIncludeJournalLineItems,
} from '@/interfaces/voucher';
import { SortOrder } from '@/constants/sort';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';

export async function findUniqueJournalInvolveInvoicePaymentInPrisma(
  journalId: number | undefined
) {
  try {
    const result = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      include: {
        invoice: {
          include: {
            payment: true,
          },
        },
      },
    });

    return result;
  } catch (error) {
    const logError = loggerError(
      0,
      'find unique journal involve invoice payment in findUniqueJournalInvolveInvoicePaymentInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related find unique journal involve invoice payment in findUniqueJournalInvolveInvoicePaymentInPrisma in voucher.repo.ts failed'
    );
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
    const logError = loggerError(
      0,
      'find first account by name in findFirstAccountByNameInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related find first account by name in findFirstAccountByNameInPrisma in voucher.repo.ts failed'
    );
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
        ],
      },
    });

    return result;
  } catch (error) {
    const logError = loggerError(
      0,
      'find first account belongs to company in findFirstAccountBelongsToCompanyInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related find first account belongs to company in findFirstAccountBelongsToCompanyInPrisma in voucher.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findUniqueVoucherInPrisma(voucherId: number) {
  let voucherData: IVoucherFromPrismaIncludeJournalLineItems | null = null;
  try {
    voucherData = await prisma.voucher.findUnique({
      where: {
        id: voucherId,
      },
      include: {
        journal: true,
        lineItems: {
          include: {
            account: true,
          },
        },
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'find unique voucher in findUniqueVoucherInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related find unique voucher in findUniqueVoucherInPrisma in voucher.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return voucherData;
}

export async function createLineItemInPrisma(
  lineItem: ILineItem,
  voucherId: number,
  companyId: number
) {
  try {
    if (!lineItem.accountId) {
      loggerBack.error(
        'lineItem.accountId is not provided in createLineItemInPrisma in voucher.repo.ts'
      );
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    const accountBelongsToCompany = await findFirstAccountBelongsToCompanyInPrisma(
      String(lineItem.accountId),
      companyId
    );

    if (!accountBelongsToCompany) {
      loggerBack.error(
        'Account does not belong to company in createLineItemInPrisma in voucher.repo.ts'
      );
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
    const logError = loggerError(
      0,
      'create line item in createLineItemInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related create line item in createLineItemInPrisma in voucher.repo.ts failed'
    );
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
        no: SortOrder.DESC,
      },
      select: {
        no: true,
        createdAt: true,
      },
    });

    const localToday = new Date();
    const localTodayNo =
      `${localToday.getFullYear()}`.padStart(4, '0') +
      `${localToday.getMonth() + 1}`.padStart(2, '0') +
      `${localToday.getDate()}`.padStart(2, '0');
    const resultDate = result?.createdAt
      ? new Date(timestampInSeconds(result?.createdAt)).getDate()
      : -1;
    const isYesterday = resultDate !== localToday.getDate();
    const latestNo = result?.no.slice(result.no.length - 3) || '0'; // Info: （ 20240522 - Murky）I want to slice the last 3 digits
    const newVoucherNo = isYesterday ? '001' : String(Number(latestNo) + 1).padStart(3, '0');

    return `${localTodayNo}${newVoucherNo}`;
  } catch (error) {
    const logError = loggerError(
      0,
      'get latest voucher no in getLatestVoucherNoInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related get latest voucher no in getLatestVoucherNoInPrisma in voucher.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function createVoucherInPrisma(newVoucherNo: string, journalId: number) {
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
    const logError = loggerError(
      0,
      'create voucher in createVoucherInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related create voucher in createVoucherInPrisma in voucher.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

// Info: (20240710 - Murky) Unefficient need to be refactor
export async function findManyVoucherWithCashInPrisma(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        journal: {
          companyId,
        },
        createdAt: {
          gte: startDateInSecond,
          lte: endDateInSecond,
        },
        lineItems: {
          some: {
            OR: CASH_AND_CASH_EQUIVALENTS_CODE.map((cashCode) => ({
              account: {
                code: {
                  startsWith: cashCode,
                },
              },
            })),
          },
        },
      },
      include: {
        journal: true,
        lineItems: {
          include: {
            account: true,
          },
        },
      },
    });

    return vouchers;
  } catch (error) {
    const logError = loggerError(
      0,
      'find many voucher with cash in findManyVoucherWithCashInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma related find many voucher with cash in findManyVoucherWithCashInPrisma in voucher.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function updateVoucherByJournalIdInPrisma(
  journalId: number,
  companyId: number,
  voucherToUpdate: IVoucherDataForSavingToDB
) {
  const nowInSecond = getTimestampNow();

  let newVoucher: {
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

  newVoucher = await prisma.$transaction(async (prismaClient) => {
    const journalExists = await prismaClient.journal.findUnique({
      where: {
        id: journalId,
        companyId,
      },
      include: {
        voucher: {
          include: {
            lineItems: true,
          },
        },
      },
    });

    // Info: (20240712 - Murky) If journal exists and voucher exists, update the voucher

    if (journalExists && journalExists?.voucher && journalExists?.voucher?.id) {
      if (journalExists?.voucher?.lineItems) {
        await prismaClient.lineItem.deleteMany({
          where: {
            voucherId: journalExists.voucher.id,
          },
        });
      }

      await Promise.all(
        voucherToUpdate.lineItems.map(async (lineItem) => {
          await prismaClient.lineItem.create({
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
                connect: { id: journalExists?.voucher?.id },
              },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            },
          });
        })
      );
      const voucherBeUpdated = await prismaClient.voucher.update({
        where: {
          id: journalExists.voucher.id,
        },
        data: {
          updatedAt: nowInSecond,
        },
        include: {
          lineItems: true,
        },
      });

      return voucherBeUpdated;
    }

    return null;
  });

  return newVoucher;
}
