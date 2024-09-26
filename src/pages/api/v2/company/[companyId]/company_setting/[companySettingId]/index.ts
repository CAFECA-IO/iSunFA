import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ICompanySetting } from '@/interfaces/company_setting';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

// ToDo: (20240924 - Jacky) Implement the logic to update an existing company setting in the database
async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Validate the request body
  // ToDo: (20240924 - Jacky) Implement the logic to update an existing company setting in the database
  // ToDo: (20240924 - Jacky) Format the company settings data to the ICompanySetting interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  const { companySettingId } = req.query;
  const { companyId, taxSerialNumber, representativeName, country, phone, address } = req.body;

  const updatedCompanySetting: ICompanySetting = {
    id: Number(companySettingId),
    companyId,
    taxSerialNumber,
    representativeName,
    country,
    phone,
    address,
  };

  payload = updatedCompanySetting;
  statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompanySetting | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanySetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompanySetting | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
