import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { FAKE_OWNED_TEAMS } from '@/lib/services/subscription_service';

const handleGetRequest: IHandleRequest<
  APIName.GET_SUPSCRIPTION_BY_TEAM_ID,
  IUserOwnedTeam | null
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserOwnedTeam | null = null;

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { teamId } = query;
  const team = FAKE_OWNED_TEAMS.find((t) => t.id === teamId);
  payload = team || null;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserOwnedTeam | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.GET_SUPSCRIPTION_BY_TEAM_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IUserOwnedTeam | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserOwnedTeam | null = null;

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
    const { httpCode, result } = formatApiResponse<IUserOwnedTeam | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
