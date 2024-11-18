import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { listUser } from '@/lib/utils/repo/user.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { User } from '@prisma/client';

const handleGetRequest: IHandleRequest<APIName.USER_LIST, User[]> = async () => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: User[] | null = null;

  const listedUser = await listUser();
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = listedUser;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUser | IUser[] | null }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.USER_LIST, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | IUser[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | IUser[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IUser | IUser[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
