import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
// import { listRole } from '@/lib/utils/repo/role.repo';
import { RoleName } from '@prisma/client';
import loggerBack from '@/lib/utils/logger_back';

const handleGetRequest: IHandleRequest<APIName.ROLE_LIST, RoleName[]> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: RoleName[] | null = null;
  const { type } = query;
  loggerBack.info(`[API] ${APIName.ROLE_LIST} - type: ${type}`);
  // Info: (20250207 - Luphia) Remove 1007 (Accountant) role from the list
  const listedUserRole = Object.values(RoleName).filter((role) => role !== RoleName.ACCOUNTANT);

  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = listedUserRole;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: RoleName[] | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.ROLE_LIST, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<RoleName[] | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: RoleName[] | null = null;

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
    const { httpCode, result } = formatApiResponse<RoleName[] | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
