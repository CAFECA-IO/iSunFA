import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { ICompanyTaxIdAndName } from '@/interfaces/account_book';
import { getSession } from '@/lib/utils/session';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { HTTP_STATUS } from '@/constants/http';

/**
 * Info: (20250423 - Shirley) Handle GET request for account book search
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Search account book by tax ID or name
 * 6. Validate output data
 * 7. Log user action and return response
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: ICompanyTaxIdAndName = { taxId: '', name: '' };

  // Info: (20250423 - Shirley) Get user session
  const session = await getSession(req);
  const { userId } = session;

  // Info: (20250423 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250423 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250423 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Info: (20250423 - Shirley) Extract query parameters
  const { name, taxId } = query;

  loggerBack.info(`User ${userId} searching account book with name: ${name}, taxId: ${taxId}`);

  const taxIdRegex = /[0-9]{8}/;
  const isTaxIdValid = taxId && taxIdRegex.test(taxId);
  const isNameExist = name && name.length > 0;

  try {
    // Info: (20250423 - Shirley) Search by tax ID if valid
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

    // Info: (20250423 - Shirley) Search by company name if exists
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

    // Info: (20250423 - Shirley) Validate output data
    const { isOutputDataValid } = validateOutputData(apiName, payload);
    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250423 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
};

/**
 * Info: (20250423 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanyTaxIdAndName | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<ICompanyTaxIdAndName | null>;

  try {
    // Info: (20250423 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      default:
        // Info: (20250423 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250423 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250423 - Shirley) Send response
  res.status(httpCode).json(result);
}
