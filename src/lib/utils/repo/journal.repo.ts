import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournalFromPrismaIncludeProjectContractInvoiceVoucher } from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { Prisma } from '@prisma/client';
import { calculateTotalPages } from '@/lib/utils/common';

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
  sortBy: 'createdAt' | 'paymentPrice' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  startDateInSecond?: number,
  endDateInSecond?: number,
  searchQuery?: string
): Promise<IPaginatedData<IJournalFromPrismaIncludeProjectContractInvoiceVoucher[]>> {
  try {
    const where: Prisma.JournalWhereInput = {
      companyId,
      createdAt: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
      invoice: {
        eventType,
      },
      tokenId: isUploaded ? { not: null } : { equals: null },
      OR: searchQuery
        ? [
            { invoice: { vendorOrSupplier: { contains: searchQuery, mode: 'insensitive' } } },
            { invoice: { description: { contains: searchQuery, mode: 'insensitive' } } },
            { voucher: { no: { contains: searchQuery, mode: 'insensitive' } } },
          ]
        : undefined,
    };

    const totalCount = await prisma.journal.count({ where });
    const totalPages = calculateTotalPages(totalCount, pageSize);

    if (page < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const orderBy =
      sortBy === 'paymentPrice'
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
      sortOrder,
      sortBy,
    };

    return pagenatedJournalList;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export async function findUniqueJournalInPrisma(journalId: number, companyId: number) {
  let journal: IJournalFromPrismaIncludeProjectContractInvoiceVoucher | null;
  try {
    journal = await prisma.journal.findUnique({
      where: {
        id: journalId,
        companyId,
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
  return journal;
}
