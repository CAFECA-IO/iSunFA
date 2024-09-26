import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ICompanySetting } from '@/interfaces/company_setting';

// ToDo: (20240924 - Jacky) Implement the logic to get the company settings data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the company settings data from the database
  // ToDo: (20240924 - Jacky) Format the company settings data to the ICompanySetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = {
    id: 1,
    companyId: 1,
    taxSerialNumber: '123456789',
    representativeName: 'John Doe',
    country: 'USA',
    phone: '123-456-7890',
    address: '123 Main St, Anytown, USA',
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

// ToDo: (20240924 - Jacky) Implement the logic to create a new company setting in the database
async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to create a new company setting in the database
  // ToDo: (20240924 - Jacky) Format the company settings data to the ICompanySetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  const newSetting: ICompanySetting = {
    id: 2,
    companyId: req.body.companyId,
    taxSerialNumber: req.body.taxSerialNumber,
    representativeName: req.body.representativeName,
    country: req.body.country,
    phone: req.body.phone,
    address: req.body.address,
  };

  payload = newSetting;
  statusMessage = STATUS_MESSAGE.CREATED;

  return { statusMessage, payload };
}

// Define method handlers for different HTTP methods
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompanySetting | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
};

// Main handler function to route requests to the appropriate handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanySetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

  try {
    // Determine the appropriate handler based on the HTTP method
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
    // Format and send the response
    const { httpCode, result } = formatApiResponse<ICompanySetting | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
