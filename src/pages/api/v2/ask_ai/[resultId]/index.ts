import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAIResultVoucher } from '@/interfaces/voucher';
import { EventType } from '@/constants/account';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { AI_TYPE } from '@/constants/aich';
import { fetchResultFromAICH, formatLineItemsFromAICH } from '@/lib/utils/aich';
import { ISessionData } from '@/interfaces/session_data';
import { fuzzySearchCounterpartyByName } from '@/lib/utils/repo/counterparty.repo';

type CertificateAiResponse = {
  aiType: AI_TYPE; // Info: (20241107 - Murky) For zod discriminator
  [key: string]: unknown;
};

type APIResponse = IAIResultVoucher | CertificateAiResponse | null;

const DEFAULT_STATUS_MESSAGE = STATUS_MESSAGE.BAD_REQUEST;
const DEFAULT_PAYLOAD = null;

// Info: (20241004 - Murky) Mock promise to simulate fetching AI result
const mockFetchAIResult = new Promise((resolve) => {
  resolve(true);
});

// Info: (20241118 - Jacky) This handler is not needed in beta version
// Info: (20241004 - Murky) Handler for the 'certificate' endpoint
async function certificateHandler() {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Simulate fetching data from an AI service
  const resultFromAI = await mockFetchAIResult;
  if (resultFromAI) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;

    // Info: (20241004 - Murky) Populate the payload with certificate details
    payload = {
      aiType: AI_TYPE.CERTIFICATE,
      inputOrOutput: 'input',
      certificateDate: 10000001, // Info: (20241004 - Murky) Example certificate date
      certificateNo: 'AB-12345678', // Info: (20241004 - Murky) Certificate number
      currencyAlias: 'TWD', // Info: (20241004 - Murky) Currency code
      priceBeforeTax: 4000, // Info: (20241004 - Murky) Price before tax
      taxRatio: 5, // Info: (20241004 - Murky) Tax percentage
      taxPrice: 200, // Info: (20241004 - Murky) Tax amount
      totalPrice: 4200, // Info: (20241004 - Murky) Total price including tax
      counterPartyId: 1, // Info: (20241004 - Murky) ID of the counterparty
      invoiceType: 'triplicate_uniform_invoice', // Info: (20241004 - Murky) Type of invoice
      deductible: true, // Info: (20241004 - Murky) Whether the amount is deductible
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Handler for the 'voucher' endpoint
// ASK_AI_RESULT_V2 希望可以回 IAIResultVoucher
async function voucherHandler(key: AI_TYPE, resultId: string, session: ISessionData) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  const { companyId } = session;
  const resultFromAI = await fetchResultFromAICH(key, resultId);
  if (resultFromAI) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    const counterparty = await fuzzySearchCounterpartyByName(
      resultFromAI.counterpartyName,
      companyId
    );
    const lineItems = await formatLineItemsFromAICH(resultFromAI.lineItems);

    const nowTimestamp = getTimestampNow();
    const voucher: IAIResultVoucher = {
      voucherDate: resultFromAI.date || nowTimestamp, // Info: (20241107 - Murky) AI必須轉換出來
      type: resultFromAI.type || EventType.INCOME, // Info: (20241107 - Murky) 可以讓AI轉換
      note: resultFromAI.note || 'this is note',
      counterParty: counterparty || PUBLIC_COUNTER_PARTY,
      lineItems,
    };

    // Info: (20241004 - Murky) Populate the payload with voucher details
    payload = voucher;
  } else {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Map of handlers for different request types
const getHandlers: {
  [key: string]: (
    key: AI_TYPE,
    resultId: string,
    session: ISessionData
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  [AI_TYPE.CERTIFICATE]: certificateHandler,
  [AI_TYPE.VOUCHER]: voucherHandler,
};

// Info: (20241004 - Murky) Function to handle GET requests
export const handleGetRequest: IHandleRequest<APIName.ASK_AI_RESULT_V2, APIResponse> = async ({
  query,
  session,
}) => {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) If query is valid, call the appropriate handler
  const { reason, resultId } = query;
  const postHandler = getHandlers[reason];
  ({ statusMessage, payload } = await postHandler(reason, resultId, session));

  return {
    statusMessage,
    payload,
  };
};

// Info: (20241004 - Murky) Map of method handlers for different HTTP methods

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.ASK_AI_RESULT_V2, req, res, handleGetRequest),
};

// Info: (20241004 - Murky) Main handler function for the API route
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;
  const userId: number = -1;

  try {
    // Info: (20241004 - Murky) Determine the request method and call the appropriate handler
    const method = req.method ?? 'UNKNOWN';
    const handleRequest = methodHandlers[method];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      // Info: (20241004 - Murky) Set status message if method is not allowed
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    // Info: (20241004 - Murky) Handle any errors that occur during request processing
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error({
      error,
      requestMethod: req.method, // Info: (20241004 - Murky) Log the HTTP method
      requestUrl: req.url, // Info: (20241004 - Murky) Log the request URL
      requestBody: '[REDACTED]', // Info: (20241004 - Murky) Mask sensitive information in the request body
      queryParams: req.query, // Info: (20241004 - Murky) Log the query parameters
    });
    statusMessage = error.message;
  }

  // Info: (20241004 - Murky) Format and send the response
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
