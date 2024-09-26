import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPendingTask, IPendingTaskTotal } from '@/interfaces/pending_task';

// ToDo: (20240924 - Jacky) Implement the logic to get the pending tasks data from the database
async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTaskTotal | null = null;

  // ToDo: (20240924 - Jacky) Get session data from the request
  // ToDo: (20240924 - Jacky) Check if the user is authorized to access this API
  // ToDo: (20240924 - Jacky) Implement the logic to get the pending tasks data from the database
  // ToDo: (20240924 - Jacky) Format the pending tasks data to the IPendingTaskTotal interface

  // Deprecated: (20240924 - Jacky) Mock data for connection
  payload = {
    id: 1,
    userId: 1,
    totalMissingCertificate: 5,
    missingCertificateList: [
      { id: 1, companyId: 1, count: 2 },
      { id: 2, companyId: 1, count: 3 },
    ],
    totalUnpostedVoucher: 3,
    unpostedVoucherList: [
      { id: 1, companyId: 1, count: 1 },
      { id: 2, companyId: 1, count: 2 },
    ],
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPendingTask | IPendingTaskTotal | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPendingTask | IPendingTaskTotal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPendingTask | IPendingTaskTotal | null = null;

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
    const { httpCode, result } = formatApiResponse<IPendingTask | IPendingTaskTotal | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
