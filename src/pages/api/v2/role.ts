import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkSessionUser, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { RoleName as PrismaRoleName } from '@prisma/client';
import { RoleName } from '@/constants/role';
import loggerBack from '@/lib/utils/logger_back';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: RoleName[] | null = null;
  await checkSessionUser(session, APIName.ROLE_LIST, req);
  await checkUserAuthorization(APIName.ROLE_LIST, req, session);
  const { type } = req.query;

  const roleList = Object.values(PrismaRoleName)
    .map((r) => RoleName[r as keyof typeof RoleName])
    .filter((r) => !!r);

  loggerBack.info(`request role list: ${JSON.stringify(roleList)} with type: ${type}`);

  statusMessage = STATUS_MESSAGE.SUCCESS;

  const { isOutputDataValid, outputData } = validateOutputData(APIName.ROLE_LIST, roleList);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);

  try {
    switch (method) {
      case 'GET':
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE];
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }
  await logUserAction(session, APIName.ROLE_LIST, req, statusMessage);

  res.status(httpCode).json(result);
}
