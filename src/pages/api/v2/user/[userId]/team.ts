import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { checkRequestData, checkSessionUser, checkUserAuthorization } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';
import { ITeam, TeamRole } from '@/interfaces/team';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { validateOutputData } from '@/lib/utils/validator';
import { TPlanType } from '@/interfaces/subscription';
import { getTeamList } from '@/lib/utils/repo/team.repo';

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

  loggerBack.info(`List Team by userId: ${userId} with query: ${JSON.stringify(query)}`);

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<ITeam[]> = await getTeamList(userId, query || undefined);
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

const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;
  const isLogin = await checkSessionUser(session, APIName.CREATE_TEAM, req);
  if (!isLogin) {
    throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  }
  const isAuth = await checkUserAuthorization(APIName.CREATE_TEAM, req, session);
  if (!isAuth) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }
  const { body } = checkRequestData(APIName.CREATE_TEAM, req, session);
  if (body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  loggerBack.info(`Create Team by userId: ${userId} with body: ${JSON.stringify(body)}`);

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const newTeam: ITeam = {
    id: 'TeamUID00001',
    imageId: '/images/fake_team_img.svg',
    role: TeamRole.OWNER,
    name: {
      value: body.name,
      editable: true,
    },
    about: {
      value: body.about ?? '',
      editable: true,
    },
    profile: {
      value: body.profile ?? '',
      editable: true,
    },
    planType: {
      value: body.planType as TPlanType,
      editable: true,
    },
    totalMembers: (body.members?.length ?? 0) + 1,
    totalAccountBooks: 0,
    bankAccount: {
      value: body.bankInfo?.number ?? '',
      editable: true,
    },
  };

  const { isOutputDataValid, outputData } = validateOutputData(APIName.CREATE_TEAM, newTeam);
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
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      case 'POST':
        ({ httpCode, result } = await handlePostRequest(req));
        break;
      default:
        ({ httpCode, result } = await handleGetRequest(req));
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
