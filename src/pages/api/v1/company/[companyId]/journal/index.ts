import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { checkAdmin } from '@/lib/utils/auth_check';
import { listJournal } from '@/lib/utils/repo/journal.repo';
import { formatIJournalListItems } from '@/lib/utils/formatter/journal.formatter';
import { IJournalListItem } from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { EVENT_TYPE } from '@/constants/account';

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

  const startDateInSecond = startDate ? timestampInSeconds(startDate) : undefined;
  const endDateInSecond = endDate ? timestampInSeconds(endDate) : undefined;
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
  const isUploaded = true;
  const uploadedPagenatedJournalList = await listJournal(
    companyId,
    isUploaded,
    page,
    pageSize,
    eventType,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    searchQuery
  );

  const upComingPagenatedJournalList = await listJournal(
    companyId,
    !isUploaded,
    page,
    pageSize,
    eventType,
    sortBy,
    sortOrder,
    startDate,
    endDate,
    searchQuery
  );
  const uploadedPagenatedJournalListItems = {
    ...uploadedPagenatedJournalList,
    data: formatIJournalListItems(uploadedPagenatedJournalList.data),
  };

  const upComingPagenatedJournalListItems = {
    ...upComingPagenatedJournalList,
    data: formatIJournalListItems(upComingPagenatedJournalList.data),
  };

  const { httpCode, result } = formatApiResponse<IPaginatedData<IJournalListItem[]>[]>(
    STATUS_MESSAGE.SUCCESS_LIST,
    [uploadedPagenatedJournalListItems, upComingPagenatedJournalListItems]
  );
  return {
    httpCode,
    result,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<IJournalListItem[]>[] | null>>
) {
  try {
    if (req.method === 'GET') {
      const session = await checkAdmin(req, res);
      const { companyId } = session;
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
