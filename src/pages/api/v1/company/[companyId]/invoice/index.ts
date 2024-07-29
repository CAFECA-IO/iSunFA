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
import { AuthFunctionsKeyStr } from '@/constants/auth';

export interface IPostApiResponseType {
  journalId: number;
  resultStatus: IAccountResultStatus;
}

// Info Murky (20240416): Utils
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCompanyIdValid(companyId: any): companyId is number {
  return typeof companyId === 'number';
}

// Info Murky (20240416): Body傳進來會是any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInvoice(invoice: any) {
  // Deprecate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  const formattedInvoice = {
    ...invoice,
    projectId: invoice.projectId ? invoice.projectId : null,
    contractId: invoice.contractId ? invoice.contractId : null,
    project: invoice.project ? invoice.project : null,
    contract: invoice.contract ? invoice.contract : null,
  };
  // Info Murky (20240416): Check if invoices is array and is Invoice type
  if (Array.isArray(formattedInvoice) || !isIInvoice(formattedInvoice)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
  }
  return formattedInvoice;
}

// Info Murky (20240612): Body傳進來會是any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatOcrId(ocrId: any): number | undefined {
  if (!ocrId) {
    return undefined;
  }

  // ToDo (20240618 - Murky) Need to use type guard instead
  if (typeof ocrId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const ocrIdNumber = Number(ocrId);
  return ocrIdNumber;
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
      body: JSON.stringify([invoiceData]), // ToDo: Murky 這邊之後要改成單一一個
    });
  } catch (error) {
    // Deprecate ( 20240522 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
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
    // Deprecate ( 20240522 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

async function handlePostRequest(companyId: number, req: NextApiRequest) {
  // Info (20240612 - Murky) ocrId is optional, if not provided, set it to undefined
  const { invoice, ocrId } = req.body;

  // Deprecate ( 20240522 - Murky ) Need to use type guard instead
  const formattedInvoice = formatInvoice(invoice);
  const formattedOcrId = formatOcrId(ocrId);

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
    formattedOcrId
  );

  const { httpCode, result } = formatApiResponse<IPostApiResponseType>(STATUS_MESSAGE.CREATED, {
    journalId,
    resultStatus,
  });
  return {
    httpCode,
    result,
  };
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
    message,
    {} as IAccountResultStatus
  );
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPostApiResponseType>>
) {
  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuthorization([AuthFunctionsKeyStr.admin], { userId, companyId });
    if (!isAuth) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    if (!isCompanyIdValid(companyId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.method === 'POST') {
      // Handle POST request to create a new invoice
      const { httpCode, result } = await handlePostRequest(companyId, req);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;

    // Deprecate ( 20240522 - Murky ) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    handleErrorResponse(res, error.message);
  }
}
