import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IUserRole } from '@/interfaces/user_role';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import {
  createUserRoleIfNotExists,
  getUserRoleListByUserId,
} from '@/lib/utils/repo/user_role.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserRole[] | null = null;
  await checkSessionUser(session, APIName.USER_ROLE_LIST, req);
  await checkUserAuthorization(APIName.USER_ROLE_LIST, req, session);

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IUserRole[] = await getUserRoleListByUserId(userId);
  const { isOutputDataValid, outputData } = validateOutputData(APIName.USER_ROLE_LIST, options);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserRole | null = null;
  await checkSessionUser(session, APIName.USER_CREATE_ROLE, req);
  await checkUserAuthorization(APIName.USER_CREATE_ROLE, req, session);

  const { body } = checkRequestData(APIName.USER_CREATE_ROLE, req, session);
  loggerBack.info(`user: ${userId} create role with body: ${JSON.stringify(body)}`);

  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const userRole = await createUserRoleIfNotExists({ userId, roleName: body.roleName });
  const { isOutputDataValid, outputData } = validateOutputData(APIName.USER_CREATE_ROLE, userRole);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.USER_ROLE_LIST;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.USER_ROLE_LIST;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.USER_CREATE_ROLE;
        ({ response, statusMessage } = await handlePostRequest(req));
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
  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
