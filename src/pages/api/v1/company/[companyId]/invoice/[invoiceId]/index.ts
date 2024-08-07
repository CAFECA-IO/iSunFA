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

export function formatInvoiceId(invoiceId: string | string[] | undefined): number {
  let invoiceIdInNumber = -1;
  if (isParamNumeric(invoiceId)) {
    invoiceIdInNumber = Number(invoiceId);
  }
  return invoiceIdInNumber;
}

// Info Murky (20240719): Get request code below
export function formatGetQuery(req: NextApiRequest) {
  const { invoiceId } = req.query;
  const invoiceIdNumber = formatInvoiceId(invoiceId);
  return invoiceIdNumber;
}

export async function handleGetRequest(
  companyId: number,
  req: NextApiRequest
): Promise<IInvoice | null> {
  let invoice: IInvoice | null = null;
  const invoiceIdNumber = formatGetQuery(req);

  if (invoiceIdNumber > 0) {
    const invoiceFromDB = await findUniqueInvoiceInPrisma(invoiceIdNumber, companyId);

    if (invoiceFromDB) {
      invoice = formatIInvoice(invoiceFromDB);
    }
  }
  return invoice;
}
// Info Murky (20240719): Get request code above

// Info Murky (20240719): Post request code below

// Info Murky (20240416): Body傳進來會是any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInvoiceFromBody(invoice: any) {
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

export async function handlePutRequest(
  companyId: number,
  req: NextApiRequest
): Promise<{
  journalId: number;
  resultStatus: IAccountResultStatus;
}> {
  // ToDo: (20240719 - Murky) 目前先從journal來決定是要upload哪一個invoice而不是從invoiceId, 需要再調整
  // const { invoiceId } = req.query;
  // const invoiceIdNumber = formatInvoiceId(invoiceId);
  const { invoice: invoiceFromBody } = req.body;
  const invoiceToUpdate = formatInvoiceFromBody(invoiceFromBody);
  const fetchResult = uploadInvoiceToAICH(invoiceToUpdate);

  const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
  const journalIdBeUpdated = await handlePrismaUpdateLogic(
    invoiceToUpdate,
    resultStatus.resultId,
    companyId
  );
  return { journalId: journalIdBeUpdated, resultStatus };
}
// Info Murky (20240719): Post request code above

type ApiReturnTypes =
  | IInvoice
  | null
  | {
      journalId: number;
      resultStatus: IAccountResultStatus;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiReturnTypes>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ApiReturnTypes = null;

  try {
    const session = await getSession(req, res);
    const { companyId } = session;
    switch (req.method) {
      case 'GET':
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.SUCCESS;
        break;
      case 'PUT':
        payload = await handlePutRequest(companyId, req);

        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        break;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<ApiReturnTypes>(statusMessage, payload);
  res.status(httpCode).json(result);
}
