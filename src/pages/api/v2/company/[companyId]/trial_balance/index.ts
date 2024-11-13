/* eslint-disable */
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ITrialBalanceTotal, MOCK_RESPONSE, TrialBalanceItem } from '@/interfaces/trial_balance';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import { listTrialBalance } from '@/lib/utils/repo/trial_balance.repo';

export const handleGetRequest: IHandleRequest<
  APIName.TRIAL_BALANCE_LIST,
  {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  }
> = async ({ query }: any) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;
  try {
    const trialBalanceData = await listTrialBalance(query);
    if (trialBalanceData) {
      payload = trialBalanceData;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: {
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.TRIAL_BALANCE_LIST, req, res, handleGetRequest),
  // GET: handleGetRequest, // 直接使用 handleGetRequest
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;

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
    const { httpCode, result } = formatApiResponse<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
