import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IKYCBookkeeper } from '@/interfaces/kyc_bookkeeper';

// ToDo: (20240924 - Jacky) Implement the logic to get the company KYC data from the database
async function handlePostRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IKYCBookkeeper | null = null;

  // ToDo: (20240924 - Jacky) Get the session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to create a new company KYC record in the database

  // Info: (20240924 - Jacky) Mock data for connection
  statusMessage = STATUS_MESSAGE.CREATED;
  payload = {
    name: 'John Doe',
    birthDate: '1990-01-01',
    email: 'doe@email.com',
    phone: '12345678',
    qualification: true,
    certificationNumber: '123456',
    personalIdType: 'ID',
    personalIdFileId: 1,
    certificationFileId: 2,
  };

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IKYCBookkeeper>>
  ) => Promise<{ statusMessage: string; payload: IKYCBookkeeper | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IKYCBookkeeper | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IKYCBookkeeper | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    // ToDo: (20240828 - Jacky) Log error message
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IKYCBookkeeper | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
