import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice } from '@/interfaces/invoice';
import { getSession } from '@/lib/utils/session';
import { findUniqueInvoiceInPrisma, handlePrismaUpdateLogic } from '@/lib/utils/repo/invoice.repo';
import { formatIInvoice } from '@/lib/utils/formatter/invoice.formatter';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';
import { AICH_URI } from '@/constants/config';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

function formatInvoiceId(invoiceId: string | string[] | undefined): number {
  let invoiceIdInNumber = -1;
  if (isParamNumeric(invoiceId)) {
    invoiceIdInNumber = Number(invoiceId);
  }
  return invoiceIdInNumber;
}

function formatGetQuery(req: NextApiRequest) {
  const { invoiceId } = req.query;
  const invoiceIdNumber = formatInvoiceId(invoiceId);
  return invoiceIdNumber;
}

function formatInvoiceFromBody(invoice: unknown) {
  if (typeof invoice !== 'object' || invoice === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
  }

  const formattedInvoice = {
    ...invoice,
    projectId: (invoice as { projectId?: unknown }).projectId
      ? (invoice as { projectId?: unknown }).projectId
      : null,
    contractId: (invoice as { contractId?: unknown }).contractId
      ? (invoice as { contractId?: unknown }).contractId
      : null,
    project: (invoice as { project?: unknown }).project
      ? (invoice as { project?: unknown }).project
      : null,
    contract: (invoice as { contract?: unknown }).contract
      ? (invoice as { contract?: unknown }).contract
      : null,
  };

  if (Array.isArray(formattedInvoice) || !isIInvoice(formattedInvoice as IInvoice)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
  }
  return formattedInvoice as IInvoice;
}

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
      const invoiceIdNumber = formatGetQuery(req);
      if (invoiceIdNumber > 0) {
        const invoiceFromDB = await findUniqueInvoiceInPrisma(invoiceIdNumber, companyId);
        if (invoiceFromDB) {
          statusMessage = STATUS_MESSAGE.SUCCESS;
          payload = formatIInvoice(invoiceFromDB);
        } else {
          statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
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
      const { invoice: invoiceFromBody } = req.body;
      const invoiceToUpdate = formatInvoiceFromBody(invoiceFromBody);
      const fetchResult = uploadInvoiceToAICH(invoiceToUpdate);

      const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
      const journalIdBeUpdated = await handlePrismaUpdateLogic(
        invoiceToUpdate,
        resultStatus.resultId,
        companyId
      );
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      payload = { journalId: journalIdBeUpdated, resultStatus };
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
