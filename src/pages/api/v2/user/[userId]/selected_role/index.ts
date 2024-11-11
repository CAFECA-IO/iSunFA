import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { getUserRoleByUserAndRoleId, updateUserRoleLoginAt } from '@/lib/utils/repo/user_role.repo';
import { setSession } from '@/lib/utils/session';
import { UserRole } from '@prisma/client';
import { IUserRole } from '@/interfaces/user_role';

const handlePutRequest: IHandleRequest<APIName.USER_SELECT_ROLE, UserRole> = async ({
  query,
  session,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: UserRole | null = null;
  const { userId } = query;
  const { roleId } = body;
  const userRole = await getUserRoleByUserAndRoleId(userId, roleId);

  if (userRole) {
    statusMessage = STATUS_MESSAGE.SUCCESS;
    setSession(session, { roleId: userRole.roleId });
    await updateUserRoleLoginAt(userRole.id);
    payload = userRole;
  } else {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserRole | null }>;
} = {
  PUT: (req, res) => withRequestValidation(APIName.USER_SELECT_ROLE, req, res, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUserRole | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserRole | null = null;

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
    const { httpCode, result } = formatApiResponse<IUserRole | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
