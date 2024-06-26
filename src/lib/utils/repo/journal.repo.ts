import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournalFromPrismaIncludeProjectContractInvoiceVoucher } from '@/interfaces/journal';

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
