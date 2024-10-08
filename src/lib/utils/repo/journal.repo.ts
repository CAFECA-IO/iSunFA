import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  IJournalFromPrismaIncludeProjectContractInvoiceVoucher,
  IJournalIncludeVoucherLineItemsInvoicePayment,
} from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { Prisma } from '@prisma/client';
import { calculateTotalPages, getTimestampNow } from '@/lib/utils/common';
import { JOURNAL_EVENT, SortBy } from '@/constants/journal';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';

export async function findManyJournalsInPrisma(
  companyId: number,
  offset: number = DEFAULT_PAGE_OFFSET,
  limit: number = DEFAULT_PAGE_LIMIT,
  eventType: string | undefined = undefined,
  startDateInSecond: number | undefined = undefined,
  endDateInSecond: number | undefined = undefined,
  search: string | undefined = undefined,
  sort: string | undefined = undefined
) {
  let journals: IJournalFromPrismaIncludeProjectContractInvoiceVoucher[];
  try {
    journals = await prisma.journal.findMany({
      orderBy: {
        createdAt: sort === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC,
      },
      skip: offset,
      take: limit,
      where: {
        companyId,
        createdAt: {
          gte: startDateInSecond,
          lte: endDateInSecond,
        },
        invoice: {
          eventType,
        },
        OR: [
          { deletedAt: 0 },
          { deletedAt: null },
          {
            invoice: {
              vendorOrSupplier: {
                contains: search,
              },
            },
          },
          {
            invoice: {
              description: {
                contains: search,
              },
            },
          },
          {
            voucher: {
              no: {
                contains: search,
              },
            },
          },
        ],
      },
      include: {
        project: {
          include: {
            imageFile: true,
          },
        },
        contract: true,
        invoice: {
          include: {
            payment: true,
            imageFile: true,
          },
        },
        voucher: {
          include: {
            lineItems: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    const logError = loggerError(
      0,
      'Find many journals in findManyJournalsInPrisma failed',
      error as Error
    );
    logError.error('Prisma find many journals in journal.repo.ts failed');
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return journals;
}

export async function listJournal(
  companyId: number,
  journalEvent?: JOURNAL_EVENT,
  page: number = 1, // Info: (202040717 - Jacky) 將 pageDelta 改為 targetPage，預設值為 1
  pageSize: number = DEFAULT_PAGE_LIMIT,
  eventType: string | undefined = undefined,
  sortBy: SortBy = SortBy.CREATED_AT,
  sortOrder: SortOrder = SortOrder.DESC,
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
): Promise<IPaginatedData<IJournalFromPrismaIncludeProjectContractInvoiceVoucher[]>> {
  try {
    const where: Prisma.JournalWhereInput = {
      event: journalEvent,
      companyId,
      createdAt: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
      invoice: {
        eventType,
      },
      AND: [
        { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
        {
          OR: [
            { invoice: { vendorOrSupplier: { contains: searchQuery, mode: 'insensitive' } } },
            { invoice: { description: { contains: searchQuery, mode: 'insensitive' } } },
            { voucher: { no: { contains: searchQuery, mode: 'insensitive' } } },
          ],
        },
      ],
    };

    const totalCount = await prisma.journal.count({ where });
    const totalPages = calculateTotalPages(totalCount, pageSize);

    if (totalPages > 0 && (page < 1 || page > totalPages)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const orderBy =
      sortBy === SortBy.PAYMENT_PRICE
        ? { invoice: { payment: { price: sortOrder } } }
        : { [sortBy]: sortOrder };

    const include = {
      project: {
        include: {
          imageFile: true,
        },
      },
      contract: true,
      invoice: { include: { payment: true, imageFile: true } },
      voucher: { include: { lineItems: { include: { account: true } } } },
    };

    const skip = (page - 1) * pageSize;

    const findManyArgs = {
      where,
      orderBy,
      include,
      take: pageSize + 1,
      skip,
    };

    const journalList = await prisma.journal.findMany(findManyArgs);

    const hasNextPage = journalList.length > pageSize;
    const hasPreviousPage = page > 1;

    if (journalList.length > pageSize) {
      journalList.pop(); // Info: (202040717 - Jacky) 移除多餘的紀錄
    }

    const sort: {
      sortBy: string; // Info: (202040717 - Jacky) 排序欄位的鍵
      sortOrder: string; // Info: (202040717 - Jacky) 排序欄位的值
    }[] = [{ sortBy, sortOrder }];

    if (journalEvent) {
      sort.push({ sortBy: journalEvent, sortOrder: '' });
    }
    const paginatedJournalList = {
      data: journalList,
      page,
      totalPages,
      totalCount,
      pageSize,
      hasNextPage,
      hasPreviousPage,
      sort,
    };

    return paginatedJournalList;
  } catch (error) {
    const logError = loggerError(0, 'List journal in listJournal failed', error as Error);
    logError.error('Func. listJournal in journal.repo.ts failed');
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findUniqueJournalInPrisma(journalId: number, companyId: number) {
  let journal: IJournalFromPrismaIncludeProjectContractInvoiceVoucher | null;
  try {
    const where: Prisma.JournalWhereUniqueInput = {
      id: journalId,
      companyId,
    };

    const include = {
      project: {
        include: {
          imageFile: true,
        },
      },
      contract: true,
      invoice: {
        include: {
          payment: true,
          imageFile: true,
        },
      },
      voucher: {
        include: {
          lineItems: {
            include: {
              account: true,
            },
          },
        },
      },
    };

    const findUniqueArgs = {
      where,
      include,
    };

    journal = await prisma.journal.findUnique(findUniqueArgs);
  } catch (error) {
    const logError = loggerError(
      0,
      'Find unique journal in findUniqueJournalInPrisma failed',
      error as Error
    );
    logError.error(
      'Prisma find unique journal in findUniqueJournalInPrisma in journal.repo.ts failed'
    );
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return journal;
}

export async function deleteJournalInPrisma(
  journalId: number,
  companyId: number
): Promise<IJournalFromPrismaIncludeProjectContractInvoiceVoucher | null> {
  let journal: IJournalFromPrismaIncludeProjectContractInvoiceVoucher | null = null;

  let journalExists: IJournalFromPrismaIncludeProjectContractInvoiceVoucher | null = null;
  // Info: (20240723 - Murky) Check if journal exists and belongs to the company
  try {
    journalExists = await findUniqueJournalInPrisma(journalId, companyId);
  } catch (error) {
    const logError = loggerError(
      0,
      'Find unique journal in deleteJournalInPrisma failed',
      error as Error
    );
    logError.error('Prisma find unique journal in deleteJournalInPrisma in journal.repo.ts failed');
  }

  if (journalExists) {
    const nowInSecond = getTimestampNow();
    try {
      journal = await prisma.$transaction(async (prismaClient) => {
        if (journalExists?.invoice?.payment) {
          await prismaClient.payment.update({
            data: {
              updatedAt: nowInSecond,
              deletedAt: nowInSecond,
            },
            where: {
              id: journalExists.invoice.payment.id,
            },
          });
        }

        if (journalExists?.invoice) {
          await prismaClient.invoice.update({
            data: {
              updatedAt: nowInSecond,
              deletedAt: nowInSecond,
            },
            where: {
              id: journalExists.invoice.id,
            },
          });
        }
        if (journalExists?.voucher) {
          await Promise.all(
            journalExists.voucher.lineItems.map(async (lineItem) => {
              await prismaClient.lineItem.update({
                data: {
                  updatedAt: nowInSecond,
                  deletedAt: nowInSecond,
                },
                where: {
                  id: lineItem.id,
                },
              });
            })
          );

          await prismaClient.voucher.update({
            data: {
              updatedAt: nowInSecond,
              deletedAt: nowInSecond,
            },
            where: {
              id: journalExists.voucher.id,
            },
          });
        }

        return prismaClient.journal.update({
          data: {
            updatedAt: nowInSecond,
            deletedAt: nowInSecond,
          },
          where: {
            id: journalId,
          },
          include: {
            project: {
              include: {
                imageFile: true,
              },
            },
            contract: true,
            invoice: {
              include: {
                payment: true,
                imageFile: true,
              },
            },
            voucher: {
              include: {
                lineItems: {
                  include: {
                    account: true,
                  },
                },
              },
            },
          },
        });
      });
    } catch (error) {
      const logError = loggerError(
        0,
        'Soft delete journal in deleteJournalInPrisma failed',
        error as Error
      );
      logError.error(
        'Prisma soft delete journal in deleteJournalInPrisma in journal.repo.ts failed'
      );
    }
  }
  return journal;
}

export async function listJournalFor401(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number
): Promise<IJournalIncludeVoucherLineItemsInvoicePayment[]> {
  const where: Prisma.JournalWhereInput = {
    companyId,
    invoice: {
      date: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
    OR: [{ deletedAt: 0 }, { deletedAt: null }],
  };
  const include = {
    invoice: { include: { payment: true } },
    voucher: { include: { lineItems: { include: { account: true } } } },
  };
  const journalList = await prisma.journal.findMany({ where, include });
  return journalList;
}
