import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { ITeam } from '@/interfaces/team';
import { FAKE_TEAM_LIST } from '@/constants/team';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ITeam[]> | null = null;
  const isLogin = await checkSessionUser(session, APIName.LIST_TEAM, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.LIST_TEAM, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { query } = checkRequestData(APIName.LIST_TEAM, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(`List Team by userId: ${userId} with query: ${JSON.stringify(query)}`);

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<ITeam[]> = {
    data: FAKE_TEAM_LIST.slice(0, 1),
  };
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_TEAM,
    toPaginatedData(options)
  );
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
      case 'GET':
      default:
        ({ httpCode, result } = await handleGetRequest(req));
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
