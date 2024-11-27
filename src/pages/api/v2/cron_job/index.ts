import { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { listCertificateWithoutInvoice } from '@/lib/utils/repo/certificate.repo';

const handleGetRequest: IHandleRequest<APIName.CRON_JOB, number[]> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number[] | null = null;
  switch (query.job) {
    case 'listCertificateWithoutInvoice': {
      const certificateList = await listCertificateWithoutInvoice();
      const fileIdlist = certificateList.map((certificate) => certificate.fileId);
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = fileIdlist;
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.BAD_REQUEST;
      payload = null;
  }
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: number[] | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.CRON_JOB, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number[] | null = null;

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
    const { httpCode, result } = formatApiResponse<number[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
