import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';

import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { ICompanyTaxIdAndName } from '@/interfaces/account_book';

const handleGetRequest: IHandleRequest<
  APIName.ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID,
  ICompanyTaxIdAndName
> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: ICompanyTaxIdAndName = { taxId: '', name: '' };

  const { name, taxId } = query;
  const { userId } = session;

  const taxIdRegex = /[0-9]{8}/;

  const isTaxIdValid = taxId && taxIdRegex.test(taxId);
  const isNameExist = name && name.length > 0;

  try {
    if (isTaxIdValid) {
      const result = await fetch(
        `https://data.gcis.nat.gov.tw/od/data/api/9D17AE0D-09B5-4732-A8F4-81ADED04B679?$format=json&$filter=Business_Accounting_NO%20eq%20${taxId}&$skip=0&$top=1`
      );
      const text = await result.text();

      if (text.length > 0) {
        const data = JSON.parse(text);
        if (data.length > 0) {
          const { Business_Accounting_NO: companyTaxId, Company_Name: companyName } = data[0];
          payload.name = companyName;
          payload.taxId = companyTaxId;
        }
      }
    }

    if (isNameExist) {
      const result = await fetch(
        `https://data.gcis.nat.gov.tw/od/data/api/6BBA2268-1367-4B42-9CCA-BC17499EBE8C?$format=json&$filter=Company_Name like ${name} and Company_Status eq 01&$skip=0&$top=1`
      );
      const text = await result.text();
      if (text.length > 0) {
        const data = JSON.parse(text);
        if (data.length > 0) {
          const { Business_Accounting_NO: companyTaxId, Company_Name: companyName } = data[0];
          payload.name = companyName;
          payload.taxId = companyTaxId;
        }
      }
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompanyTaxIdAndName | null }>;
} = {
  GET: (req) =>
    withRequestValidation(APIName.ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyTaxIdAndName | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyTaxIdAndName | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompanyTaxIdAndName | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
