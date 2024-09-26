import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { mockTrialBalanceList } from '@/pages/api/v2/company/[companyId]/trial_balance/service';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

type APIResponse =
  | object
  | {
      currency: string;
      items: unknown;
      total: unknown;
    }
  | null;

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  const session = await getSession(req, res);
  const { userId } = session;

  const { query } = validateRequest(APIName.TRIAL_BALANCE_LIST_V2, req, userId);

  if (query) {
    const { startDate, endDate, page, pageSize, sortOrder } = query;
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      currency: 'TWD',
      items: {
        data: mockTrialBalanceList,
        page,
        totalPages: 1,
        totalCount: mockTrialBalanceList.length,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false,
        sort: [
          {
            sortBy: 'no',
            sortOrder,
          },
        ],
      },
      total: {
        beginningCreditAmount: 0,
        beginningDebitAmount: 2285000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 2285000,
        endingCreditAmount: 0,
        endingDebitAmount: 2285000,
        createAt: startDate,
        updateAt: endDate,
      },
    };
  }

  return {
    statusMessage,
    payload,
  };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: APIResponse }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

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
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
