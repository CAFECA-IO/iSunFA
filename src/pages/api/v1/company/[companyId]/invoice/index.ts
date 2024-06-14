import { NextApiRequest, NextApiResponse } from 'next';
import { IInvoice } from '@/interfaces/invoice';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { formatApiResponse } from '@/lib/utils/common';
import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIAccountResultStatus } from '@/lib/utils/type_guard/account';
import { handlePrismaSavingLogic } from '@/pages/api/v1/company/[companyId]/invoice/invoice.repository';

interface IPostApiResponseType {
  journalId: number;
  resultStatus: IAccountResultStatus;
}

// Info Murky (20240416): Utils
function isCompanyIdValid(companyId: string | string[] | undefined): companyId is string {
  if (Array.isArray(companyId)) {
    return false;
  }

  const companyIdRegex = /^\d+$/;
  return companyIdRegex.test(companyId as string);
}

// Info Murky (20240416): Body傳進來會是any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInvoice(invoice: any) {
  // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
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

async function uploadInvoiceToAICH(invoice: IInvoice) {
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
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
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

async function handlePostRequest(
  companyId: string,
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPostApiResponseType>>
) {
  const { invoice } = req.body;

  const formattedInvoice = formatInvoice(invoice);

  // Post to AICH
  const fetchResult = uploadInvoiceToAICH(formattedInvoice);

  const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);

  if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
  }

  // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  // const { projectId, contractId } = getProjectIdAndContractIdFromInvoice(formattedInvoice);

  const journalId = await handlePrismaSavingLogic(
    formattedInvoice,
    resultStatus.resultId,
    Number(companyId)
  );

  const { httpCode, result } = formatApiResponse<IPostApiResponseType>(STATUS_MESSAGE.CREATED, {
    journalId,
    resultStatus,
  });
  res.status(httpCode).json(result);
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
    const { companyId } = req.query;
    if (!isCompanyIdValid(companyId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.method === 'POST') {
      // Handle POST request to create a new invoice
      await handlePostRequest(companyId, req, res);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    handleErrorResponse(res, error.message);
  }
}
