import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournal } from '@/interfaces/journal';
import { formatIJournal } from '@/lib/utils/formatter/journal.formatter';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import {
  deleteInvoiceVoucherJournal,
  getInvoiceVoucherJournalByJournalId,
} from '@/lib/utils/repo/beta_transition.repo';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IJournal | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { query } = validateRequest(APIName.JOURNAL_GET_BY_ID, req, userId);
      if (query) {
        const { journalId } = query;
        try {
          const journalData = await getInvoiceVoucherJournalByJournalId(journalId);
          if (journalData) {
            payload = formatIJournal(journalData);
            statusMessage = STATUS_MESSAGE.SUCCESS;
          } else {
            statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          }
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IJournal | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { query } = validateRequest(APIName.JOURNAL_DELETE, req, userId);
      if (query) {
        const { journalId } = query;
        try {
          const journalData = await deleteInvoiceVoucherJournal(journalId, companyId);
          if (journalData) {
            payload = formatIJournal(journalData);
            statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
          } else {
            statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          }
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IJournal | null>>
  ) => Promise<{ statusMessage: string; payload: IJournal | null }>;
} = {
  GET: handleGetRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IJournal | null = null;

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
    const { httpCode, result } = formatApiResponse<IJournal | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
