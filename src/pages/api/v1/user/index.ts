import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { createUser, listUser } from '@/lib/utils/repo/user.repo';
import { formatUser, formatUserList } from '@/lib/utils/formatter/user.formatter';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | IUser[] | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.superAdmin], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const listedUser = await listUser();
      const userList: IUser[] = await formatUserList(listedUser);
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      payload = userList;
    }
  }

  return { statusMessage, payload };
}

async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | IUser[] | null = null;
  const { name, fullName, email, phone, credentialId, publicKey, algorithm, imageId } = req.body;

  if (!name || !credentialId || !publicKey || !algorithm) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;

    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const isAuth = await checkAuthorization([AuthFunctionsKeys.superAdmin], {
        userId,
        companyId,
      });

      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        const createdUser = await createUser({
          name,
          fullName,
          email,
          phone,
          imageUrl: imageId,
        });
        const user = formatUser(createdUser);
        statusMessage = STATUS_MESSAGE.CREATED;
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
  ) => Promise<{ statusMessage: string; payload: IUser | IUser[] | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
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
