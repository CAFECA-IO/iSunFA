import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { ITeam } from '@/interfaces/team';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { createTeam } from '@/lib/utils/repo/team.repo';

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;
  await checkSessionUser(session, APIName.CREATE_TEAM, req);
  await checkUserAuthorization(APIName.CREATE_TEAM, req, session);

  const { body } = checkRequestData(APIName.CREATE_TEAM, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(`Create Team by userId: ${userId} with body: ${JSON.stringify(body)}`);

  const createdTeam = await createTeam(userId, body);

  statusMessage = STATUS_MESSAGE.SUCCESS;

  const { isOutputDataValid, outputData } = validateOutputData(APIName.CREATE_TEAM, createdTeam);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }
  const result = formatApiResponse(statusMessage, payload);
  return result;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case 'POST':
        ({ httpCode, result } = await handlePostRequest(req));
        break;
      default:
        ({ httpCode, result } = formatApiResponse<null>(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    ({ httpCode, result } = formatApiResponse<null>(
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    ));
  }

  res.status(httpCode).json(result);
}
