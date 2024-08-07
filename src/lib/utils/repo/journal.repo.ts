import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournalFromPrismaIncludeProjectContractInvoiceVoucher } from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { Prisma } from '@prisma/client';
import { calculateTotalPages, getTimestampNow } from '@/lib/utils/common';
import { JOURNAL_EVENT, SortBy, SortOrder } from '@/constants/journal';

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
        createdAt: sort === 'asc' ? 'asc' : 'desc',
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
        project: true,
        contract: true,
        invoice: {
          include: {
            payment: true,
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
    // Deprecated: (20240522 - Murk) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
  return journals;
}

export async function listJournal(
  companyId: number,
  isUploaded: boolean,
  page: number = 1, // 将 pageDelta 改为 targetPage，默认值为 1
  pageSize: number = DEFAULT_PAGE_LIMIT,
  eventType: string | undefined = undefined,
  sortBy: SortBy = SortBy.CREATED_AT,
  sortOrder: SortOrder = SortOrder.DESC,
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
): Promise<IPaginatedData<IJournalFromPrismaIncludeProjectContractInvoiceVoucher[]>> {
  try {
    const journalEvent = isUploaded === true ? JOURNAL_EVENT.UPLOADED : JOURNAL_EVENT.UPCOMING;
    const where: Prisma.JournalWhereInput = {
      deletedAt: null,
      event: journalEvent,
      companyId,
      createdAt: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
      invoice: {
        eventType,
      },
      tokenId: isUploaded ? { not: null } : { equals: null },
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
      ...(searchQuery
        ? [
            { invoice: { vendorOrSupplier: { contains: searchQuery, mode: 'insensitive' } } },
            { invoice: { description: { contains: searchQuery, mode: 'insensitive' } } },
            { voucher: { no: { contains: searchQuery, mode: 'insensitive' } } },
          ]
        : {}),
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
      project: true,
      contract: true,
      invoice: { include: { payment: true } },
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
      journalList.pop(); // 移除多余的记录
    }
    const pagenatedJournalList = {
      data: journalList,
      page,
      totalPages,
      totalCount,
      pageSize,
      hasNextPage,
      hasPreviousPage,
      sort: [
        { sortBy, sortOrder },
        { sortBy: journalEvent, sortOrder: '' },
      ],
    };

    return pagenatedJournalList;
  } catch (error) {
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
      project: true,
      contract: true,
      invoice: {
        include: {
          payment: true,
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
    // Deprecated: (20240522 - Murk) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
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
    // Deprecated: (20240522 - Murk) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
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
            project: true,
            contract: true,
            invoice: {
              include: {
                payment: true,
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
      // Deprecated: (20240522 - Murk) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(error);
    }
  }
  return journal;
}
