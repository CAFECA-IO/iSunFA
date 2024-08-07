import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse, timestampInSeconds } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { listJournal } from '@/lib/utils/repo/journal.repo';
import { formatIJournalListItems } from '@/lib/utils/formatter/journal.formatter';
import { IJournalListItem } from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { EVENT_TYPE } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

// ToDo: (20240617 - Murky) Need to use function in type guard instead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCompanyIdValid(companyId: any): companyId is number {
  if (Array.isArray(companyId) || !companyId || typeof companyId !== 'number') {
    return false;
  }
  return true;
}

// ToDo: (20240625 - Murky) Need to move to type guard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatQuery(query: any) {
  const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } = query;

  if (
    (page && !Number.isInteger(Number(page))) ||
    (pageSize && !Number.isInteger(Number(pageSize))) ||
    (sortBy && typeof sortBy !== 'string') ||
    (sortOrder && typeof sortOrder !== 'string') ||
    (startDate && !Number.isInteger(Number(startDate))) ||
    (endDate && !Number.isInteger(Number(endDate))) ||
    (searchQuery && typeof searchQuery !== 'string') ||
    (eventType && !Object.values(EVENT_TYPE).includes(eventType))
  ) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const startDateNumber = startDate ? convertStringToNumber(startDate) : undefined;
  const endDateNumber = endDate ? convertStringToNumber(endDate) : undefined;
  const startDateInSecond =
    startDateNumber !== undefined ? timestampInSeconds(startDateNumber) : undefined;
  const endDateInSecond =
    endDateNumber !== undefined ? timestampInSeconds(endDateNumber) : undefined;
  const cleanQuery = {
    page: page ? Number(page) : DEFAULT_PAGE_START_AT,
    pageSize: pageSize ? Number(pageSize) : DEFAULT_PAGE_LIMIT,
    eventType: eventType || undefined,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'desc',
    startDate: startDateInSecond,
    endDate: endDateInSecond,
    searchQuery: searchQuery || undefined,
  };

  return cleanQuery;
}

export async function handleGetRequest(companyId: number, req: NextApiRequest) {
  const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } =
    formatQuery(req.query);
  const uploadedPaginatedJournalList = await listJournal(
    companyId,
    JOURNAL_EVENT.UPLOADED,
    page,
    pageSize,
    eventType,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    searchQuery
  );

  const upComingPaginatedJournalList = await listJournal(
    companyId,
    JOURNAL_EVENT.UPCOMING,
    page,
    pageSize,
    eventType,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    searchQuery
  );
  const uploadedPaginatedJournalListItems = {
    ...uploadedPaginatedJournalList,
    data: formatIJournalListItems(uploadedPaginatedJournalList.data),
  };

  const upComingPaginatedJournalListItems = {
    ...upComingPaginatedJournalList,
    data: formatIJournalListItems(upComingPaginatedJournalList.data),
  };

  const { httpCode, result } = formatApiResponse<{
    [key: string]: IPaginatedData<IJournalListItem[]>;
  }>(STATUS_MESSAGE.SUCCESS_LIST, {
    [JOURNAL_EVENT.UPLOADED]: uploadedPaginatedJournalListItems,
    [JOURNAL_EVENT.UPCOMING]: upComingPaginatedJournalListItems,
  });
  return {
    httpCode,
    result,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{
      [key: string]: IPaginatedData<IJournalListItem[]>;
    } | null>
  >
) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      if (!isCompanyIdValid(companyId)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const { httpCode, result } = await handleGetRequest(companyId, req);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<null>(error.message, null);
    res.status(httpCode).json(result);
  }
}
