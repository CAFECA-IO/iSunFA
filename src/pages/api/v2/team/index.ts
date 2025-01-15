import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { TPlanType, IUserOwnedTeam, TPaymentStatus } from '@/interfaces/subscription';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination';

const FAKE_OWNED_TEAMS: IUserOwnedTeam[] = [
  {
    id: 1,
    name: 'Personal',
    plan: TPlanType.BEGINNER,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 0,
    expiredTimestamp: 0,
    paymentStatus: TPaymentStatus.FREE,
  },
  {
    id: 2,
    name: 'Team A',
    plan: TPlanType.PROFESSIONAL,
    enableAutoRenewal: true,
    nextRenewalTimestamp: 1736936488530,
    expiredTimestamp: 1736936488530,
    paymentStatus: TPaymentStatus.UNPAID,
  },
  {
    id: 3,
    name: 'Team B',
    plan: TPlanType.ENTERPRISE,
    enableAutoRenewal: false,
    nextRenewalTimestamp: 1736936488530,
    expiredTimestamp: 1736936488530,
    paymentStatus: TPaymentStatus.PAID,
  },
];

const handleGetRequest: IHandleRequest<
  APIName.LIST_TEAM,
  IPaginatedData<IUserOwnedTeam[]> | null
> = async () => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<IUserOwnedTeam[]> | null = null;

  statusMessage = STATUS_MESSAGE.SUCCESS;
  const options: IPaginatedOptions<IUserOwnedTeam[]> = {
    data: FAKE_OWNED_TEAMS,
  };
  payload = toPaginatedData(options);
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedData<IUserOwnedTeam[]> | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.LIST_TEAM, req, handleGetRequest),
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
