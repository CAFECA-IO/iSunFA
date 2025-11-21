import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { IFaithContent } from '@/interfaces/faith';

const apiName = APIName.GET_CONTENT_BY_ID_IN_FAITH_SESSION;

const dummyContent: IFaithContent = {
  id: 'content-001',
  role: {
    id: 'role-001',
    name: 'Student',
    image: 'https://storage.cafeca.io/api/v1/file/QmWZ3tiDVhEpSfvwLaHrVeBSkk4PSerFSHkUR7c6EqoFFd',
  },
  content: 'This is a sample content.',
  like: true,
  dislike: false,
  createdAt: 1756550400,
};

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // ToDo: (20251120 - Luphia) Business logic here.
  const result = dummyContent;

  const { isOutputDataValid, outputData } = validateOutputData(apiName, result);

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  const apiName = APIName.LIST_FAITH_SESSION;

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
