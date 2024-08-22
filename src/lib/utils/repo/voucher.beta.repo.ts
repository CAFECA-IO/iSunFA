import prisma from '@/client';
import { CASH_AND_CASH_EQUIVALENTS_CODE } from '@/constants/cash_flow/common_cash_flow';
import {
  IVoucherDataForSavingToDB,
  IVoucherFromPrismaIncludeJournalLineItems,
} from '@/interfaces/voucher';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Voucher } from '@prisma/client';

/**
 * This function can get the latest voucher no
 * @param {number} companyId - company that you want to get the latest voucher no (type: number)
 * @returns {Promise<string>} return the latest voucher no (type: Promise<string>)
 */
export async function getLatestVoucherNo(companyId: number) {
  let voucherNo: string | null = '';

  let voucher: Voucher | null = null;

  const where: Prisma.VoucherWhereInput = {
    journal: {
      companyId,
    },
  };

  const orderBy: Prisma.VoucherOrderByWithRelationInput = {
    no: 'desc',
  };

  const select: Prisma.VoucherSelect = {
    no: true,
    createdAt: true,
  };

  const findFirstArgs: Prisma.VoucherFindFirstArgs = {
    where,
    orderBy,
    select,
  };

  try {
    voucher = await prisma.voucher.findFirst(findFirstArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }

  const localToday = new Date();
  const localTodayNo =
    `${localToday.getFullYear()}`.padStart(4, '0') +
    `${localToday.getMonth() + 1}`.padStart(2, '0') +
    `${localToday.getDate()}`.padStart(2, '0');
  const resultDate = voucher?.createdAt
    ? new Date(timestampInSeconds(voucher?.createdAt)).getDate()
    : -1;
  const isYesterday = resultDate !== localToday.getDate();
  const latestNo = voucher?.no.slice(voucher.no.length - 3) || '0'; // Info: （ 20240522 - Murky）I want to slice the last 3 digits
  const newVoucherNo = isYesterday ? '001' : String(Number(latestNo) + 1).padStart(3, '0');

  voucherNo = `${localTodayNo}${newVoucherNo}`;

  return voucherNo;
}

/**
 * Find unique voucher by voucher id
 * @param {number} voucherId - voucher id that you want to find (type: number)
 * @returns {Promise<IVoucherFromPrismaIncludeJournalLineItems | null>} return include journal and line items, will be null if not found or error (type: Promise<IVoucherFromPrismaIncludeJournalLineItems | null>)
 */
export async function findUniqueVoucherById(voucherId: number) {
  let voucherData: IVoucherFromPrismaIncludeJournalLineItems | null = null;

  const where: Prisma.VoucherWhereUniqueInput = {
    id: voucherId,
  };

  const include = {
    journal: true,
    lineItems: {
      include: {
        account: true,
      },
    },
  };

  const findUniqueArgs = {
    where,
    include,
  };

  try {
    voucherData = await prisma.voucher.findUnique(findUniqueArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }
  return voucherData;
}

/**
 * Create a voucher record by newVoucherNo and journalId
 * @param {string} newVoucherNo - newest voucher no that you want set to new voucher no (type: string)
 * @param {number} journalId - journal id that you want to connect to new voucher (type: number)
 * @returns {Promise<Voucher | null>} return a voucher record or null (type: Promise<Voucher | null>)
 */
export async function createVoucherInPrisma(newVoucherNo: string, journalId: number) {
  let voucherData: Voucher | null = null;

  const nowTimestamp = getTimestampNow();

  const journalConnect: Prisma.JournalUpdateOneRequiredWithoutInvoiceNestedInput = {
    connect: {
      id: journalId,
    },
  };

  const data: Prisma.VoucherCreateInput = {
    no: newVoucherNo,
    journal: journalConnect,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
  };

  const voucherCreateArgs = {
    data,
  };

  try {
    voucherData = await prisma.voucher.create(voucherCreateArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }

  return voucherData;
}

/**
 * Find many vouchers with cash account in line items account
 * @param {number} companyId - company id that you want to find the vouchers (type: number)
 * @param {number} startDateInSecond - start date in second that you want to find the vouchers (type: number)
 * @param {number} endDateInSecond - end date in second that you want to find the vouchers (type: number)
 * @returns {Promise<IVoucherFromPrismaIncludeJournalLineItems[]>} return include journal and line items, will be empty array if not found or error (type: Promise<IVoucherFromPrismaIncludeJournalLineItems[]>)
 */
export async function findManyVoucherWithCashInPrisma(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number
) {
  let vouchers: IVoucherFromPrismaIncludeJournalLineItems[] = [];

  const where: Prisma.VoucherWhereInput = {
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
  };

  const include = {
    journal: true,
    lineItems: {
      include: {
        account: true,
      },
    },
  };

  const findManyArgs = {
    where,
    include,
  };
  try {
    vouchers = await prisma.voucher.findMany(findManyArgs);
  } catch (error) {
    // Todo: (20240822 - Murky Anna) 使用 logger
  }

  return vouchers;
}

/**
 * Update a voucher record by voucher id
 * @param {number} voucherId - voucher id that you want to update (type: number)
 * @param {IVoucherDataForSavingToDB} voucherToUpdate - voucher data that you want to update to voucher id provided (type: IVoucherDataForSavingToDB)
 * @returns {Promise<IVoucherFromPrismaIncludeJournalLineItems | null>} return a voucher record or null (type: Promise<IVoucherFromPrismaIncludeJournalLineItems | null>)
 */
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
