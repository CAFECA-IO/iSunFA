import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatIJournalListItems } from '@/lib/utils/formatter/journal.formatter';
import { IJournalListItem } from '@/interfaces/journal';
import { IPaginatedData } from '@/interfaces/pagination';
import { JOURNAL_EVENT } from '@/constants/journal';
import { getSession } from '@/lib/utils/session';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { listInvoiceVoucherJournal } from '@/lib/utils/repo/beta_transition.repo';

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { [key: string]: IPaginatedData<IJournalListItem[]> } | null = null;

  const session = await getSession(req);
  const { userId, accountBookId: companyId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const { query } = validateRequest(APIName.JOURNAL_LIST, req, userId);

    if (query) {
      const { page, pageSize, eventType, sortBy, sortOrder, startDate, endDate, searchQuery } =
        query;
      try {
        const uploadedPaginatedJournalList = await listInvoiceVoucherJournal(
          companyId,
          JOURNAL_EVENT.UPLOADED,
          eventType,
          page,
          pageSize,
          sortBy,
          sortOrder,
          startDate,
          endDate,
          searchQuery
        );
        const upComingPaginatedJournalList = await listInvoiceVoucherJournal(
          companyId,
          JOURNAL_EVENT.UPCOMING,
          eventType,
          page,
          pageSize,
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
    res: NextApiResponse<
      IResponseData<{ [key: string]: IPaginatedData<IJournalListItem[]> } | null>
    >
  ) => Promise<{
    statusMessage: string;
    payload: { [key: string]: IPaginatedData<IJournalListItem[]> } | null;
  }>;
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
    const { httpCode, result } = formatApiResponse<{
      [key: string]: IPaginatedData<IJournalListItem[]>;
    } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
