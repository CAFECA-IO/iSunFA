import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { cancelDeleteUserById, getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { User } from '@prisma/client';

const handlePutRequest: IHandleRequest<APIName.USER_DELETION_UPDATE, User | null> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: User | null = null;

  const { userId } = query;

  const getUser = await getUserById(userId);
  if (!getUser) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    const updatedUser = await cancelDeleteUserById(userId);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedUser;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUser | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.USER_DELETION_UPDATE, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;

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
    const { httpCode, result } = formatApiResponse<IUser | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
