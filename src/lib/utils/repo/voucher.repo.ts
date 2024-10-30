// ToDo: (20241011 - Jacky) Temporarily commnet the following code for the beta transition
import { getTimestampNow, timestampInMilliSeconds, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { STATUS_MESSAGE } from '@/constants/status_code';
import type { ILineItem } from '@/interfaces/line_item';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import {
  IVoucherDataForSavingToDB,
  IVoucherEntity,
  IVoucherFromPrismaIncludeJournalLineItems,
} from '@/interfaces/voucher';
import { SortOrder } from '@/constants/sort';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import type { ICompanyEntity } from '@/interfaces/company';
import type { IEventEntity } from '@/interfaces/event';
import { IUserEntity } from '@/interfaces/user';
import { assert } from 'console';

export async function findUniqueJournalInvolveInvoicePaymentInPrisma(
  journalId: number | undefined
) {
  try {
    const result = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      include: {
        invoiceVoucherJournals: {
          include: {
            invoice: true,
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
        invoiceVoucherJournals: {
          include: {
            journal: true,
          },
        },
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

export async function getLatestVoucherNoInPrisma(
  companyId: number,
  {
    voucherDate,
  }: {
    voucherDate?: number;
  } = {}
) {
  try {
    let result: { createdAt: number; no: string } | null = null;
    const baseDate = voucherDate ? new Date(timestampInMilliSeconds(voucherDate)) : new Date();
    const startOfDay = new Date(baseDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(baseDate);
    endOfDay.setHours(23, 59, 59, 999);

    result = await prisma.voucher.findFirst({
      where: {
        companyId,
        date: {
          gte: timestampInSeconds(startOfDay.getTime()),
          lte: timestampInSeconds(endOfDay.getTime()),
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

    // 格式化日期為 YYYYMMDD
    const formattedDate =
      `${startOfDay.getFullYear()}`.padStart(4, '0') +
      `${startOfDay.getMonth() + 1}`.padStart(2, '0') +
      `${startOfDay.getDate()}`.padStart(2, '0');

    const latestNo = result?.no.slice(-3) || '000'; // 取最後三位數字作為流水號
    const newVoucherNo = String(Number(latestNo) + 1).padStart(3, '0');

    return `${formattedDate}${newVoucherNo}`;
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

// export async function createVoucherInPrisma(newVoucherNo: string, journalId: number) {
//   try {
//     const now = Date.now();
//     const nowTimestamp = timestampInSeconds(now);
//     const voucherData = await prisma.voucher.create({
//       data: {
//         no: newVoucherNo,
//         journal: {
//           connect: {
//             id: journalId,
//           },
//         },
//         createdAt: nowTimestamp,
//         updatedAt: nowTimestamp,
//       },
//       select: {
//         id: true,
//         lineItems: true,
//       },
//     });

//     return voucherData;
//   } catch (error) {
//     const logError = loggerError(
//       0,
//       'create voucher in createVoucherInPrisma failed',
//       error as Error
//     );
//     logError.error(
//       'Prisma related create voucher in createVoucherInPrisma in voucher.repo.ts failed'
//     );
//     throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
//   }
// }

// Info: (20240710 - Murky) Unefficient need to be refactor
export async function findManyVoucherWithCashInPrisma(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
        date: {
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

// ToDo: (20241011 - Jacky) Temporarily commnet the following code for the beta transition
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
        invoiceVoucherJournals: {
          include: {
            voucher: {
              include: {
                lineItems: true,
              },
            },
          },
        },
      },
    });
    const voucherExists = journalExists?.invoiceVoucherJournals?.[0]?.voucher;

    // Info: (20240712 - Murky) If journal exists and voucher exists, update the voucher

    if (journalExists && voucherExists && voucherExists.id) {
      if (voucherExists.lineItems) {
        await prismaClient.lineItem.deleteMany({
          where: {
            voucherId: voucherExists.id,
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
                connect: { id: voucherExists.id },
              },
              createdAt: nowInSecond,
              updatedAt: nowInSecond,
            },
          });
        })
      );
      const voucherBeUpdated = await prismaClient.voucher.update({
        where: {
          id: voucherExists.id,
        },
        data: {
          updatedAt: nowInSecond,
        },
        include: {
          lineItems: true,
        },
      });
      const newVoucherData = {
        ...voucherBeUpdated,
        journalId,
      };

      return newVoucherData;
    }

    return null;
  });

  return newVoucher;
}

export async function countUnpostedVoucher(companyId: number) {
  const missingCertificatesCount = await prisma.voucher.count({
    where: {
      companyId, // 指定公司 ID
      NOT: {
        voucherCertificates: {
          some: {},
        },
      },
      company: {},
    },
  });

  return missingCertificatesCount;
}

export async function postVoucherV2({
  nowInSecond,
  company,
  originalVoucher,
  issuer,
  eventControlPanel: { revertEvent },
}: {
  nowInSecond: number;
  company: ICompanyEntity;
  originalVoucher: IVoucherEntity;
  issuer: IUserEntity;
  eventControlPanel: {
    revertEvent: IEventEntity | null;
    recurringEvent: IEventEntity | null;
    assetEvent: IEventEntity | null;
  };
}) {
  // ToDo: (20241030 - Murky) Implement recurringEvent and assetEvent
  // const isRecurringEvent = !!recurringEvent;
  // const isAssetEvent = !!assetEvent;
  const isRevertEvent = !!revertEvent;

  const voucherCreated = await prisma.$transaction(async (tx) => {
    const originalVoucherNo = await getLatestVoucherNoInPrisma(company.id, {
      voucherDate: originalVoucher.date,
    });

    const originalVoucherInDB = await tx.voucher.create({
      data: {
        no: originalVoucherNo,
        date: originalVoucher.date,
        type: originalVoucher.type,
        note: originalVoucher.note,
        status: originalVoucher.status,
        editable: originalVoucher.editable,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        company: {
          connect: {
            id: company.id,
          },
        },
        issuer: {
          connect: {
            id: issuer.id,
          },
        },
        counterparty: {
          connect: {
            id: originalVoucher.counterPartyId,
          },
        },
        lineItems: {
          create: originalVoucher.lineItems.map((lineItem) => ({
            amount: lineItem.amount,
            description: lineItem.description,
            debit: lineItem.debit,
            account: {
              connect: {
                id: lineItem.accountId,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          })),
        },
      },
    });

    if (isRevertEvent) {
      const { associateVouchers } = revertEvent;

      assert(
        associateVouchers,
        'associateVouchers is not provided in postVoucherV2 in voucher.repo.ts'
      );
      assert(
        associateVouchers.length > 0,
        'associateVouchers is empty in postVoucherV2 in voucher.repo.ts'
      );

      associateVouchers.map(async (associateVoucher) => {
        const { originalVoucher: original } = associateVoucher;
        const { resultVoucher } = associateVoucher;

        // ToDo: (20241030 - Murky) 需要存放lineItems和lineItems的對應關係
        // const originalLineItems = original.lineItems[0]
        // const resultLineItems = resultVoucher.lineItems[0]

        const eventInDB = await tx.event.create({
          data: {
            eventType: revertEvent.eventType,
            frequence: revertEvent.frequency,
            startDate: revertEvent.startDate,
            endDate: revertEvent.endDate,
            daysOfWeek: revertEvent.dateOfWeek,
            monthsOfYear: revertEvent.monthsOfYear.map((month) => String(month)),
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          },
        });

        await tx.accociateVoucher.create({
          data: {
            originalVoucher: {
              connect: {
                id: original.id,
              },
            },
            resultVoucher: {
              connect: {
                id: resultVoucher.id,
              },
            },
            event: {
              connect: {
                id: eventInDB.id,
              },
            },
            createdAt: nowInSecond,
            updatedAt: nowInSecond,
          },
        });
      });
    }
    return originalVoucherInDB;
  });
  return voucherCreated;
}
