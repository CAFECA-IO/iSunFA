import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  createUserRole,
  getUserRoleByUserAndRoleId,
  listUserRole,
} from '@/lib/utils/repo/user_role.repo';
import { UserRole } from '@prisma/client';
import { IUserRole } from '@/interfaces/user_role';

const handleGetRequest: IHandleRequest<APIName.USER_ROLE_LIST, UserRole[]> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: UserRole[] | null = null;
  const { userId } = query;
  const listedUserRole = await listUserRole(userId);

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = listedUserRole;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.USER_CREATE_ROLE, UserRole | null> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: UserRole | null = null;

  // Deprecated: (20240924 - Jacky) Mock data for connection
  statusMessage = STATUS_MESSAGE.CREATED;
  const { userId } = query;
  const { roleId } = body;
  const getUserRole = await getUserRoleByUserAndRoleId(userId, roleId);
  if (getUserRole) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_ROLE;
  } else {
    const createdUserRole = await createUserRole(userId, roleId);
    payload = createdUserRole;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserRole | IUserRole[] | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.USER_ROLE_LIST, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.USER_CREATE_ROLE, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUserRole | IUserRole[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserRole | IUserRole[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IUserRole | IUserRole[] | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
