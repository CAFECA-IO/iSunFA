import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { isUserAdmin } from '@/lib/utils/auth_check';
import { handlePrismaSavingLogic } from '@/lib/utils/repo/invoice.repo';
import { generateInvoiceFromSalaryRecord } from '@/lib/utils/repo/salary_record.repo';
import {
  uploadInvoiceToAICH,
  getPayloadFromResponseJSON,
  IPostApiResponseType,
} from '@/pages/api/v1/company/[companyId]/invoice/index';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { isIAccountResultStatus } from '@/lib/utils/type_guard/account';

function checkInput(salaryRecordsIdsList: number[]): boolean {
  return (
    Array.isArray(salaryRecordsIdsList) &&
    salaryRecordsIdsList.every((id) => typeof id === 'number')
  );
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPostApiResponseType | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPostApiResponseType | null = null;

  const { salaryRecordsIdsList } = req.body;
  const isValid = checkInput(salaryRecordsIdsList);
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await isUserAdmin(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const invoiceFromSalaryRecord = await generateInvoiceFromSalaryRecord(
        companyId,
        salaryRecordsIdsList
      );
      const fetchResult = uploadInvoiceToAICH(invoiceFromSalaryRecord);
      const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
      if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
      }
      const journalId = await handlePrismaSavingLogic(
        invoiceFromSalaryRecord,
        resultStatus.resultId,
        companyId,
        undefined
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = {
        journalId,
        resultStatus,
      };
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
    payload: IPostApiResponseType | null;
  }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPostApiResponseType | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPostApiResponseType | null = null;
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
    const { httpCode, result } = formatApiResponse<IPostApiResponseType | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
