import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { createUserAgreement } from '@/lib/utils/repo/user_agreement.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';

const handlePostRequest: IHandleRequest<APIName.AGREE_TO_TERMS, string | null> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;

  const { agreementHash } = body;
  const { userId } = query;
  const userAgreement = await createUserAgreement(userId, agreementHash);
  if (userAgreement) {
    statusMessage = STATUS_MESSAGE.CREATED;
    payload = userAgreement.agreementHash;
  }
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: string | null }>;
} = {
  POST: (req, res) => withRequestValidation(APIName.AGREE_TO_TERMS, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;

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
    const { httpCode, result } = formatApiResponse<string | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
