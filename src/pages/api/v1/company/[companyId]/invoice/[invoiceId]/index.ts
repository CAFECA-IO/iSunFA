import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice } from '@/interfaces/invoice';
import { getSession } from '@/lib/utils/session';
import { findUniqueInvoiceInPrisma, handlePrismaUpdateLogic } from '@/lib/utils/repo/invoice.repo';
import { formatIInvoice } from '@/lib/utils/formatter/invoice.formatter';
// import { isIInvoice } from '@/lib/utils/type_guard/invoice';
import { AICH_URI } from '@/constants/config';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

async function uploadInvoiceToAICH(invoice: IInvoice) {
  let response: Response;

  try {
    const { journalId, ...invoiceData } = invoice;

    response = await fetch(`${AICH_URI}/api/v1/vouchers/upload_invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([invoiceData]),
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInvoice | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { query } = validateRequest(APIName.INVOICE_GET_BY_ID, req, userId);
      if (query) {
        const { invoiceId } = query;
        if (invoiceId > 0) {
          const invoiceFromDB = await findUniqueInvoiceInPrisma(invoiceId, companyId);
          if (invoiceFromDB) {
            statusMessage = STATUS_MESSAGE.SUCCESS;
            payload = formatIInvoice(invoiceFromDB);
          } else {
            statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          }
        }
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{ journalId: number; resultStatus: IAccountResultStatus } | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: { journalId: number; resultStatus: IAccountResultStatus } | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], { userId, companyId });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { body } = validateRequest(APIName.INVOICE_UPDATE, req, userId);
      if (body) {
        const { invoice } = body;
        // const invoiceToUpdate = formatInvoiceFromBody(invoice);
        const fetchResult = uploadInvoiceToAICH(invoice);

        const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
        const journalIdBeUpdated = await handlePrismaUpdateLogic(
          invoice,
          resultStatus.resultId,
          companyId
        );
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = { journalId: journalIdBeUpdated, resultStatus };
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IInvoice | null | { journalId: number; resultStatus: IAccountResultStatus } | null;
  }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      IInvoice | null | { journalId: number; resultStatus: IAccountResultStatus } | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IInvoice | null | { journalId: number; resultStatus: IAccountResultStatus } | null =
    null;

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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<
      IInvoice | null | { journalId: number; resultStatus: IAccountResultStatus } | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
