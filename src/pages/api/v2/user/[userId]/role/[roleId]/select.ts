import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { getUserRoleByUserAndRoleId } from '@/lib/utils/repo/user_role.repo';
import { setSession } from '@/lib/utils/session';

const handlePutRequest: IHandleRequest<APIName.ROLE_SELECT, IRole> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRole | null = null;
  const { userId, roleId } = query;
  const userRole = await getUserRoleByUserAndRoleId(userId, roleId);

  if (userRole) {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    setSession(session, { roleId: userRole.roleId });
    payload = userRole.role;
  } else {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IRole | null }>;
} = {
  PUT: (req, res) => withRequestValidation(APIName.ROLE_SELECT, req, res, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IRole | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IRole | null = null;

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
    const { httpCode, result } = formatApiResponse<IRole | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
