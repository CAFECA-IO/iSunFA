import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { ITeam } from '@/interfaces/team';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { FAKE_TEAM_LIST } from '@/constants/team';

const handleGetRequest: IHandleRequest<APIName.GET_TEAM_BY_ID, ITeam | null> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const { teamId } = query;
  const team = FAKE_TEAM_LIST.find((t) => t.id === teamId);
  payload = team || null;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ITeam | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.GET_TEAM_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITeam | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITeam | null = null;

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
    const { httpCode, result } = formatApiResponse<ITeam | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
