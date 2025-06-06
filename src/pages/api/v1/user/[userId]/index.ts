import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { getUserById, updateUserById } from '@/lib/utils/repo/user.repo';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';

async function checkInput(userId: string, name: string, email: string): Promise<boolean> {
  const isValid = !!userId && !!name && !!email;
  return isValid;
}

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;

  const session = await getSession(req);
  const { userId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const getUser = await getUserById(userId);
    if (!getUser) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    } else {
      const user = formatUser(getUser);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = user;
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | null = null;

  const queryUserId = req.query.userId as string;
  const { name, email, imageId } = req.body;
  const isValid = await checkInput(queryUserId, name, email);

  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req);
    const { userId } = session;

    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const userIdNum = convertStringToNumber(queryUserId);
      const getUser = await getUserById(userIdNum);
      if (!getUser) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        const updatedUser = await updateUserById(userIdNum, name, email, imageId);
        const user = formatUser(updatedUser);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = user;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUser | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
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
