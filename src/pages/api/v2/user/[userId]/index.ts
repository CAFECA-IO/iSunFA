import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IUser } from '@/interfaces/user';
import { formatApiResponse } from '@/lib/utils/common';
import { getUserById, updateUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { User } from '@prisma/client';
import { getLatestUserActionLogByUserId } from '@/lib/utils/repo/user_action_log.repo';
import { IUserProfile } from '@/lib/utils/zod_schema/user';

const handleGetRequest: IHandleRequest<APIName.USER_GET_BY_ID, IUserProfile | null> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserProfile | null = null;

  const { userId } = query;

  const getUser = await getUserById(userId);
  const getUserActionLog = await getLatestUserActionLogByUserId(userId);

  payload = {
    id: getUser?.id ?? 0,
    name: getUser?.name ?? '',
    email: getUser?.email ?? '',
    imageId: getUser?.imageFile?.url ?? '',
    agreementList:
      getUser?.userAgreements.map((userAgreement) => userAgreement.agreementHash) ?? [],
    createdAt: getUser?.createdAt ?? 0,
    updatedAt: getUser?.updatedAt ?? 0,
    deletedAt: getUser?.deletedAt ?? 0,
    device: getUserActionLog?.userAgent ?? '',
    ip: getUserActionLog?.ipAddress ?? '',
  };
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.USER_UPDATE, User | null> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: User | null = null;

  const { userId } = query;
  const { name, email } = body;
  const getUser = await getUserById(userId);
  if (!getUser) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    const updatedUser = await updateUserById(userId, name, email);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedUser;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUser | IUserProfile | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.USER_GET_BY_ID, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.USER_UPDATE, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUser | IUserProfile | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUser | IUserProfile | null = null;

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
    const { httpCode, result } = formatApiResponse<IUser | IUserProfile | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
