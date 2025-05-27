import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortBy } from '@/constants/journal';
import { SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow, pageToOffset, timestampInSeconds } from '@/lib/utils/common';
import { Prisma, Counterparty } from '@prisma/client';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';

export async function getCounterpartyByName(options: {
  name: string;
  accountBookId: number;
}): Promise<Counterparty | null> {
  const { name, accountBookId } = options;
  const counterparty = await prisma.counterparty.findFirst({
    where: {
      name,
      accountBookId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });

  return counterparty;
}

export async function getCounterpartyByTaxId(options: {
  taxId: string;
  accountBookId: number;
}): Promise<Counterparty | null> {
  const { taxId, accountBookId } = options;
  const counterparty = await prisma.counterparty.findFirst({
    where: { taxId, accountBookId, OR: [{ deletedAt: 0 }, { deletedAt: null }] },
  });
  return counterparty;
}

// Info: (20241022 - Jacky) Create
export async function createCounterparty(
  accountBookId: number,
  name: string,
  taxId: string,
  type: string,
  note: string = ''
): Promise<Counterparty> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const newCounterparty = await prisma.counterparty.create({
    data: {
      accountBookId,
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
  accountBookId: number,
  targetPage: number = DEFAULT_PAGE_NUMBER,
  pageSize: number = DEFAULT_PAGE_LIMIT,
  type?: string,
  searchQuery?: string,
  sortOrder: SortOrder = SortOrder.DESC,
  sortBy: SortBy = SortBy.CREATED_AT
) {
  let counterparties: Counterparty[] = [];
  const where: Prisma.CounterpartyWhereInput = {
    accountBookId,
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'find many counterparties in listCounterparties failed',
      errorMessage: (error as Error).message,
    });
  }

  const totalCount = counterparties.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (targetPage < 1) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const skip = pageToOffset(targetPage, pageSize);

  const paginatedCounterpartiesFromDB = counterparties.slice(skip, skip + pageSize);
  const paginatedCounterparties = paginatedCounterpartiesFromDB.map((counterparty) =>
    parsePrismaCounterPartyToCounterPartyEntity(counterparty)
  );

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

export async function fuzzySearchCounterpartyByName(name: string, accountBookId: number) {
  let counterparty: Counterparty | null = null;

  const counterpartyName = name || '';

  try {
    // Info: (20241119 - Luphia) be mindful of the risks associated with raw queries
    const counterparties: Counterparty[] = await prisma.$queryRaw`
      SELECT * FROM public."counterparty"
      WHERE company_id = ${accountBookId}
      ORDER BY SIMILARITY(name, ${counterpartyName}) DESC
      LIMIT 1;
    `;
    [counterparty] = counterparties;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'Fuzzy search counterparty by name in fuzzySearchCounterpartyByName failed',
      errorMessage: (error as Error).message,
    });
  }
  return counterparty;
}
