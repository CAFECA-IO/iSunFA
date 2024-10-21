import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { createUserRole, listUserRole } from '@/lib/utils/repo/user_role.repo';
import { formatUserRoleList } from '@/lib/utils/formatter/role.formatter';

const handleGetRequest: IHandleRequest<APIName.ROLE_LIST, IRole[]> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRole[] | null = null;
  const { userId } = query;
  const listedUserRole = await listUserRole(userId);
  const roleList = formatUserRoleList(listedUserRole);

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = roleList;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.CREATE_ROLE, IRole> = async ({ body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRole | null = null;

  // Deprecated: (20240924 - Jacky) Mock data for connection
  statusMessage = STATUS_MESSAGE.CREATED;
  const { userId, roleId } = body;
  const createdUserRole = await createUserRole(userId, roleId);
  const { role } = createdUserRole;
  payload = role;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IRole | IRole[] | null }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.ROLE_LIST, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.CREATE_ROLE, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRole | IRole[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRole | IRole[] | null = null;

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
    const { httpCode, result } = formatApiResponse<IRole | IRole[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
