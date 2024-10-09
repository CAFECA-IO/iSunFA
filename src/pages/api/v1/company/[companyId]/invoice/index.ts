import { NextApiRequest, NextApiResponse } from 'next';
import { IInvoice } from '@/interfaces/invoice';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { formatApiResponse } from '@/lib/utils/common';
import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIAccountResultStatus } from '@/lib/utils/type_guard/account';
import { handlePrismaSavingLogic } from '@/lib/utils/repo/invoice.repo';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { InvoiceType } from '@/constants/invoice';
import { loggerError, loggerRequest } from '@/lib/utils/logger_back';
import { APIName, APIPath } from '@/constants/api_connection';
import { validateRequest } from '@/lib/utils/request_validator';
import { EventType } from '@/constants/account';

// Info: (20240416 - Murky) Body傳進來會是any
function formatInvoice(invoice: IInvoice) {
  // Deprecate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  const now = Date.now(); // Info: (20240807 - Jacky) for fake unique invoice number
  // Info: (20240916 - Jacky) default invoice type is PURCHASE_TRIPLICATE_AND_ELECTRONIC
  let invoiceType = InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC;
  // Info: (20240916 - Jacky) if eventType is INCOME, then invoice type is SALES_TRIPLICATE_INVOICE
  if (invoice.eventType === EventType.INCOME) {
    invoiceType = InvoiceType.SALES_TRIPLICATE_INVOICE;
  }
  const formattedInvoice = {
    ...invoice,
    number: now.toString() + invoice.journalId,
    type: invoiceType,
    vendorTaxId: 'temp fake id',
    deductible: true,
    projectId: invoice.projectId ? invoice.projectId : null,
    contractId: invoice.contractId ? invoice.contractId : null,
    project: invoice.project ? invoice.project : null,
    contract: invoice.contract ? invoice.contract : null,
  };
  // Info: (20240416 - Murky) Check if invoices is array and is Invoice type
  if (Array.isArray(formattedInvoice) || !isIInvoice(formattedInvoice)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
  }
  return formattedInvoice;
}

export async function uploadInvoiceToAICH(invoice: IInvoice) {
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
    const logError = loggerError(0, 'upload invoice to AICH failed', error as Error);
    logError.error(
      'upload invoice to AICH failed when fetch in uploadInvoiceToAICH in invoice/index.ts'
    );
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    const logError = loggerError(0, 'get payload from response JSON failed', error as Error);
    logError.error(
      'get payload from response JSON failed when await responseJSON in getPayloadFromResponseJSON in invoice/index.ts'
    );
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

async function handlePostRequest({
  companyId,
  invoice,
  ocrId,
}: {
  companyId: number;
  invoice: IInvoice;
  ocrId?: number;
}) {
  // Info (20240612 - Murky) ocrId is optional, if not provided, set it to undefined
  // Deprecate ( 20240522 - Murky ) Need to use type guard instead
  const formattedInvoice = formatInvoice(invoice);

  // Post to AICH
  const fetchResult = uploadInvoiceToAICH(formattedInvoice);

  const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);

  if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE);
  }

  // Deprecate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  // const { projectId, contractId } = getProjectIdAndContractIdFromInvoice(formattedInvoice);

  const journalId = await handlePrismaSavingLogic(
    formattedInvoice,
    resultStatus.resultId,
    companyId,
    ocrId
  );

  const payload = {
    journalId,
    resultStatus,
  };

  const statusMessage = STATUS_MESSAGE.SUCCESS;
  return {
    payload,
    statusMessage,
  };
}

type APIReturnType = {
  journalId: number;
  resultStatus: IAccountResultStatus;
} | null;

const methodHandlers: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (arg: any) => Promise<{ statusMessage: string; payload: APIReturnType }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIReturnType>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  let payload: APIReturnType = null;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  if (isAuth) {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      const { body } = validateRequest(APIName.INVOICE_CREATE, req, userId);
      if (body) {
        ({ statusMessage, payload } = await handleRequest({
          companyId,
          invoice: body.invoice,
          ocrId: body.ocrId,
        }));
      }
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } else {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;

    const logger = loggerRequest(
      userId,
      APIPath[APIName.INVOICE_CREATE],
      req.method || 'unknown',
      401,
      { message: 'Forbidden' },
      req.headers['user-agent'] || 'unknown user-agent',
      req.socket.remoteAddress || 'unknown ip'
    );

    logger.error('Request validation failed');
  }

  const { httpCode, result } = formatApiResponse<APIReturnType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
