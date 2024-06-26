import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, pageToOffset, timestampInSeconds } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { checkAdmin } from '@/lib/utils/auth_check';
import { findManyJournalsInPrisma } from '@/lib/utils/repo/journal.repo';
import { formatIJournalListItems } from '@/lib/utils/formatter/journal.formatter';
import { IJournalListItem } from '@/interfaces/journal';

// ToDo: (20240617 - Murky) Need to use function in type guard instead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCompanyIdValid(companyId: any): companyId is number {
  if (
    Array.isArray(companyId) ||
    !companyId ||
    typeof companyId !== 'number'
  ) {
    return false;
  }
  return true;
}

// ToDo: (20240625 - Murky) Need to move to type guard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatQuery(query: any) {
  const { page, limit, eventType, startDate, endDate, search, sort } = query;

  if (
    (page && !Number.isInteger(Number(page))) ||
    (limit && !Number.isInteger(Number(limit))) ||
    (eventType && typeof eventType !== 'string') ||
    (startDate && !Number.isInteger(Number(startDate))) ||
    (endDate && !Number.isInteger(Number(endDate))) ||
    (search && typeof search !== 'string') ||
    (sort && typeof sort !== 'string')) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const startDateInSecond = startDate ? timestampInSeconds(startDate) : undefined;
  const endDateInSecond = endDate ? timestampInSeconds(endDate) : undefined;

  const cleanQuery = {
    page: page ? Number(page) : DEFAULT_PAGE_START_AT,
    limit: limit ? Number(limit) : DEFAULT_PAGE_LIMIT,
    eventType: eventType ? String(eventType) : undefined,
    startDate: startDateInSecond,
    endDate: endDateInSecond,
    search: search ? String(search) : undefined,
    sort: sort ? String(sort) : undefined
  };

  return cleanQuery;
}

export async function handleGetRequest(companyId: number, req: NextApiRequest) {
  const {
    page, // can be undefined
    limit,
    eventType,
    startDate,
    endDate,
    search,
    sort
  } = formatQuery(req.query);

  const offset = pageToOffset(page, limit);
  const journalFromPrisma = await findManyJournalsInPrisma(
    companyId,
    offset,
    limit,
    eventType,
    startDate,
    endDate,
    search,
    sort
  );
  const journals = formatIJournalListItems(journalFromPrisma);

  const { httpCode, result } = formatApiResponse<IJournalListItem[]>(
    STATUS_MESSAGE.SUCCESS_LIST,
    journals
  );
  return {
    httpCode,
    result
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournalListItem[]>>
) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  if (!isCompanyIdValid(companyId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  try {
    if (req.method === 'GET') {
      const { httpCode, result } = await handleGetRequest(companyId, req);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IJournalListItem[]>(error.message, {} as IJournalListItem[]);
    res.status(httpCode).json(result);
  }
}
