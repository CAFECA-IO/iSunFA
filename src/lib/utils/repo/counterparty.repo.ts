import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortBy } from '@/constants/journal';
import { SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow, pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Counterparty } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';

// Info: (20241022 - Jacky) Create
export async function createCounterparty(
  companyId: number,
  name: string,
  taxId: string,
  type: string,
  note: string = ''
): Promise<Counterparty> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newCounterparty = await prisma.counterparty.create({
    data: {
      companyId,
      name,
      taxId,
      type,
      note,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    },
  });
  return newCounterparty;
}

// Info: (20241022 - Jacky) List
export async function listCounterparty(
  companyId: number,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  type?: string,
  searchQuery?: string,
  sortOrder: SortOrder = SortOrder.DESC,
  sortBy: SortBy = SortBy.CREATED_AT
) {
  let counterparties: Counterparty[] = [];
  const where: Prisma.CounterpartyWhereInput = {
    companyId,
    type,
    AND: [
      { OR: [{ deletedAt: 0 }, { deletedAt: null }] },
      {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { taxId: { contains: searchQuery, mode: 'insensitive' } },
          { type: { contains: searchQuery, mode: 'insensitive' } },
          { note: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
    ],
  };

  const findManyArgs: Prisma.CounterpartyFindManyArgs = {
    where,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };

  try {
    counterparties = await prisma.counterparty.findMany(findManyArgs);
  } catch (error) {
    const logError = loggerError(
      0,
      'find many counterparties in listCounterparties failed',
      error as Error
    );
    logError.error(
      'Prisma related find many counterparties in listCounterparties in counterparty.repo.ts failed'
    );
  }

  const totalCount = counterparties.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedCounterparties = counterparties.slice(skip, skip + pageSize);

  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = targetPage > 1;

  const sort: {
    sortBy: string;
    sortOrder: string;
  }[] = [{ sortBy, sortOrder }];

  return {
    data: paginatedCounterparties,
    page: targetPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort,
  };
}

export async function getCounterpartyById(id: number): Promise<Counterparty | null> {
  const counterparty = await prisma.counterparty.findFirst({
    where: {
      id,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });

  return counterparty;
}

export async function updateCounterpartyById(
  id: number,
  name: string,
  taxId: string,
  type: string,
  note: string
): Promise<Counterparty> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CounterpartyWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.CounterpartyUpdateInput = {
    name,
    taxId,
    type,
    note,
    updatedAt: nowInSecond,
  };

  const updateArgs: Prisma.CounterpartyUpdateArgs = {
    where,
    data,
  };
  const updatedCounterparty = await prisma.counterparty.update(updateArgs);
  return updatedCounterparty;
}

export async function deleteCounterpartyById(id: number): Promise<Counterparty> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.CounterpartyWhereUniqueInput = {
    id,
    deletedAt: null,
  };

  const data: Prisma.CounterpartyUpdateInput = {
    updatedAt: nowInSecond,
    deletedAt: nowInSecond,
  };

  const updateArgs: Prisma.CounterpartyUpdateArgs = {
    where,
    data,
  };
  const deletedCounterparty = await prisma.counterparty.update(updateArgs);
  return deletedCounterparty;
}

// Info: (20241022 - Jacky) Real delete for testing
export async function deleteCounterpartyForTesting(id: number): Promise<Counterparty> {
  const where: Prisma.CounterpartyWhereUniqueInput = {
    id,
  };

  const deletedCounterparty = await prisma.counterparty.delete({
    where,
  });

  return deletedCounterparty;
}
