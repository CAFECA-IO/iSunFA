import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';

type APIResponse = object | null;

const DEFAULT_STATUS_MESSAGE = STATUS_MESSAGE.BAD_REQUEST;
const DEFAULT_PAYLOAD: APIResponse = null;

// Info: (20241004 - Murky) Mock promise to simulate fetching AI result
const mockFetchAIResult = new Promise((resolve) => {
  resolve(true);
});

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
async function voucherHandler() {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Simulate fetching data from an AI service
  const resultFromAI = await mockFetchAIResult;
  if (resultFromAI) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;

    // Info: (20241004 - Murky) Populate the payload with voucher details
    payload = {
      voucherDate: 1000000, // Info: (20241004 - Murky) Example voucher date
      type: 'payment', // Info: (20241004 - Murky) Type of voucher (e.g., payment, transfer, receiving)
      note: 'This is a note', // Info: (20241004 - Murky) Additional notes for the voucher
      counterPartyId: 1001, // Info: (20241004 - Murky) ID of the counterparty
      lineItemsInfo: {
        sum: {
          debit: true, // Info: (20241004 - Murky) Whether the sum is debit or credit
          amount: 1000, // Info: (20241004 - Murky) Total amount
        },
        lineItems: [
          {
            id: 1001, // Info: (20241004 - Murky) Line item ID
            amount: 1000, // Info: (20241004 - Murky) Amount for this line item
            description: 'This is a description', // Info: (20241004 - Murky) Description of the line item
            debit: true, // Info: (20241004 - Murky) Whether this line item is debit
            accountId: 1001, // Info: (20241004 - Murky) Account ID associated with this line item
          },
          {
            id: 1002, // Info: (20241004 - Murky) Line item ID
            amount: 1001, // Info: (20241004 - Murky) Amount for this line item
            description: 'This is a description', // Info: (20241004 - Murky) Description of the line item
            debit: false, // Info: (20241004 - Murky) Whether this line item is credit
            accountId: 1002, // Info: (20241004 - Murky) Account ID associated with this line item
          },
        ],
      },
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Map of handlers for different request types
const getHandlers: {
  [key: string]: () => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  certificate: certificateHandler,
  voucher: voucherHandler,
};

// Info: (20241004 - Murky) Function to handle GET requests
export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Get user session information
  const { userId } = await getSession(req, res);

  // Info: (20241004 - Murky) Validate the request and extract query parameters
  const { query } = validateRequest(APIName.AI_ASK_RESULT_V2, req, userId);

  // Info: (20241004 - Murky) If query is valid, call the appropriate handler
  if (query && query.reason) {
    const postHandler = getHandlers[query.reason];
    ({ statusMessage, payload } = await postHandler());
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}

// Info: (20241004 - Murky) Map of method handlers for different HTTP methods
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
    userId: number;
  }>;
} = {
  GET: handleGetRequest,
};

// Info: (20241004 - Murky) Main handler function for the API route
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;
  let userId: number = -1;

  try {
    // Info: (20241004 - Murky) Determine the request method and call the appropriate handler
    const method = req.method ?? 'UNKNOWN';
    const handleRequest = methodHandlers[method];
    if (handleRequest) {
      ({ statusMessage, payload, userId } = await handleRequest(req, res));
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
