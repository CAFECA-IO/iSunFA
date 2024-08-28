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
import { EVENT_TYPE, EventType } from '@/constants/account';
import { JOURNAL_EVENT, SortBy } from '@/constants/journal';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import { SortOrder } from '@/constants/sort';

function isCompanyIdValid(companyId: unknown): companyId is number {
  return typeof companyId === 'number';
}

function isValidQuery(query: unknown): query is {
  page?: string;
  pageSize?: string;
  eventType?: EventType;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
} {
  if (typeof query !== 'object' || query === null) {
    return false;
  }

  const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } = query as {
    page?: string;
    pageSize?: string;
    eventType?: EventType;
    sortBy?: SortBy;
    sortOrder?: SortOrder;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
  };

  return (
    (page === undefined || Number.isInteger(Number(page))) &&
    (pageSize === undefined || Number.isInteger(Number(pageSize))) &&
    (sortBy === undefined || isEnumValue(SortBy, sortBy)) &&
    (sortOrder === undefined || isEnumValue(SortOrder, sortOrder)) &&
    (startDate === undefined || Number.isInteger(Number(startDate))) &&
    (endDate === undefined || Number.isInteger(Number(endDate))) &&
    (searchQuery === undefined || typeof searchQuery === 'string') &&
    (eventType === undefined || isEnumValue(EVENT_TYPE, eventType))
  );
}

function formatQuery(query: unknown) {
  if (typeof query !== 'object' || query === null || !isValidQuery(query)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } = query;

  const startDateNumber = startDate ? convertStringToNumber(startDate) : undefined;
  const endDateNumber = endDate ? convertStringToNumber(endDate) : undefined;
  const startDateInSecond = startDateNumber !== undefined ? timestampInSeconds(startDateNumber) : undefined;
  const endDateInSecond = endDateNumber !== undefined ? timestampInSeconds(endDateNumber) : undefined;

  return {
    page: page ? Number(page) : DEFAULT_PAGE_START_AT,
    pageSize: pageSize ? Number(pageSize) : DEFAULT_PAGE_LIMIT,
    eventType: eventType || undefined,
    sortBy: sortBy || SortBy.CREATED_AT,
    sortOrder: sortOrder || SortOrder.DESC,
    startDate: startDateInSecond,
    endDate: endDateInSecond,
    searchQuery: searchQuery || undefined,
  };
}

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<{ [key: string]: IPaginatedData<IJournalListItem[]> } | null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { [key: string]: IPaginatedData<IJournalListItem[]> } | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else if (!isCompanyIdValid(companyId)) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
    } else {
      const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } = formatQuery(req.query);
      try {
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

        payload = {
          [JOURNAL_EVENT.UPLOADED]: uploadedPaginatedJournalListItems,
          [JOURNAL_EVENT.UPCOMING]: upComingPaginatedJournalListItems,
        };
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<{ [key: string]: IPaginatedData<IJournalListItem[]> } | null>>
  ) => Promise<{ statusMessage: string; payload: { [key: string]: IPaginatedData<IJournalListItem[]> } | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<{ [key: string]: IPaginatedData<IJournalListItem[]> } | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { [key: string]: IPaginatedData<IJournalListItem[]> } | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<{ [key: string]: IPaginatedData<IJournalListItem[]> } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
