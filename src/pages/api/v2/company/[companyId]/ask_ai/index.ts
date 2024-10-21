import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { loggerError } from '@/lib/utils/logger_back';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import {
  certificateValidator,
  helpValidator,
  voucherValidator,
} from '@/lib/utils/zod_schema/ask_ai';

type APIResponse = object | null;

const DEFAULT_STATUS_MESSAGE = STATUS_MESSAGE.BAD_REQUEST;
const DEFAULT_PAYLOAD: APIResponse = null;

// Info: (20241004 - Murky) Handler for the 'help' endpoint
async function helpHandler(key: string, body: object) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Validate the body using the helpValidator schema
  const bodyParsed = helpValidator.safeParse(body);

  if (bodyParsed.success) {
    statusMessage = STATUS_MESSAGE.CREATED;

    // Info: (20241004 - Murky) Extract content from the parsed data and create a response payload
    const { content } = bodyParsed.data;
    payload = {
      reason: key,
      content,
      answer: 'it is 42', // Info: (20241004 - Murky) Example response, replace with actual logic as needed
    };
  }
  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Handler for the 'certificate' endpoint
async function certificateHandler(key: string, body: object) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Validate the body using the certificateValidator schema
  const bodyParsed = certificateValidator.safeParse(body);

  if (bodyParsed.success) {
    statusMessage = STATUS_MESSAGE.CREATED;

    // ToDo: (20241004 - Murky) Use FileId to post to FAITH
    // Info: (20241004 - Murky) Consider providing a more detailed explanation of how the FileId should be used to post to FAITH, or referencing any related documentation for better clarity.
    // const { fileId } = bodyParsed.data;
    payload = {
      reason: key,
      resultId: 'a1b2c3d4f5g6h7i8j9k0', // Placeholder resultId, replace with actual logic
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Handler for the 'voucher' endpoint
async function voucherHandler(key: string, body: object) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Validate the body using the voucherValidator schema
  const bodyParsed = voucherValidator.safeParse(body);

  if (bodyParsed.success) {
    statusMessage = STATUS_MESSAGE.CREATED;

    // ToDo: (20241004 - Murky) Use FileId to post to FAITH
    // Info: (20241004 - Murky) Consider providing a more detailed explanation of how the FileId should be used to post to FAITH, or referencing any related documentation for better clarity.
    // const { fileId } = bodyParsed.data;
    payload = {
      reason: key,
      resultId: 'a1b2c3d4f5g6h7i8j9k0', // Placeholder resultId, replace with actual logic
    };
  }

  return {
    statusMessage,
    payload,
  };
}

// Info: (20241004 - Murky) Map of postHandlers for different request types
const postHandlers: {
  [key: string]: (
    key: string,
    body: object
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  help: helpHandler,
  certificate: certificateHandler,
  voucher: voucherHandler,
};

// Info: (20241004 - Murky) Function to handle POST requests
export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = DEFAULT_STATUS_MESSAGE;
  let payload: APIResponse = DEFAULT_PAYLOAD;

  // Info: (20241004 - Murky) Get user session information
  const { userId } = await getSession(req, res);

  // Info: (20241004 - Murky) Validate the request and extract query and body
  const { query, body } = validateRequest(APIName.AI_ASK_V2, req, userId);

  // Info: (20241004 - Murky) If query and body are valid, call the appropriate postHandler
  if (query && body) {
    const postHandler = postHandlers[query.reason];
    ({ statusMessage, payload } = await postHandler(query.reason, body));
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
  POST: handlePostRequest,
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
    const method = req.method ?? '';
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
      requestBody: req.body, // Info: (20241004 - Murky) Log the request body
      queryParams: req.query, // Info: (20241004 - Murky) Log the query parameters
    });
    statusMessage = error.message;
  }

  // Info: (20241004 - Murky) Format and send the response
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
