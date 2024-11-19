import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ProgressStatus } from '@/constants/account';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IAskResult } from '@/interfaces/ask_ai';
import { AI_TYPE } from '@/constants/aich';
import { fetchResultIdFromAICH } from '@/lib/utils/aich';

const handleCertificateRequest = async (key: AI_TYPE, targetId: number) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const certificate = { fileId: targetId };

  const resultId = await fetchResultIdFromAICH(key, certificate);
  statusMessage = STATUS_MESSAGE.CREATED;
  payload = {
    reason: key,
    resultId,
    progressStatus: ProgressStatus.IN_PROGRESS,
  };

  return { statusMessage, payload };
};

const handleVoucherRequest = async (key: AI_TYPE, targetId: number) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const voucher = { certificateId: targetId };

  const resultId = await fetchResultIdFromAICH(key, voucher);

  statusMessage = STATUS_MESSAGE.CREATED;
  payload = {
    reason: key,
    resultId,
    progressStatus: ProgressStatus.IN_PROGRESS,
  };

  return { statusMessage, payload };
};

const postHandlers: {
  [key: string]: (
    key: AI_TYPE,
    targetId: number
  ) => Promise<{ statusMessage: string; payload: IAskResult | null }>;
} = {
  certificate: handleCertificateRequest,
  voucher: handleVoucherRequest,
};

export const handlePostRequest: IHandleRequest<APIName.ASK_AI_V2, IAskResult | null> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

  const { reason } = query;
  const { targetId } = body;

  const postHandler = postHandlers[reason];
  ({ statusMessage, payload } = await postHandler(reason, targetId));

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAskResult | null }>;
} = {
  POST: (req, res) => withRequestValidation(APIName.ASK_AI_V2, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAskResult | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAskResult | null = null;

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
  } finally {
    const { httpCode, result } = formatApiResponse<IAskResult | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
