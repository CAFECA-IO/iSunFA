import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { IUserOwnedTeam } from '@/interfaces/subscription';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { listTeamSubscription } from '@/lib/utils/repo/team_subscription.repo';
import { getSession } from '@/lib/utils/session';

const handleGetRequest: IHandleRequest<
  APIName.LIST_TEAM_SUBSCRIPTION,
  IPaginatedData<IUserOwnedTeam[]> | null
> = async ({ req }) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserOwnedTeam[]> | null = null;

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<IUserOwnedTeam[]> = await listTeamSubscription(userId);
  payload = toPaginatedData(options);
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<IUserOwnedTeam[]> | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.LIST_TEAM_SUBSCRIPTION, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedData<IUserOwnedTeam[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserOwnedTeam[]> | null = null;

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
    const { httpCode, result } = formatApiResponse<IPaginatedData<IUserOwnedTeam[]> | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
