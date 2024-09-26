import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';
import { mockLedgerList } from '@/pages/api/v2/company/[companyId]/ledger/service';

type APIResponse = {
  currency: string;
  items: {
    data: Array<{
      id: number;
      voucherDate: number;
      no: string;
      accountingTitle: string;
      voucherNumber: string;
      particulars: string;
      debitAmount: number;
      creditAmount: number;
      balance: number;
      createAt: number;
      updateAt: number;
    }>;
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    sort: Array<{
      sortBy: string;
      sortOrder: string;
    }>;
  };
  totalDebitAmount: number;
  totalCreditAmount: number;
} | null;

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

  // TODO: 實作時確認 auth (20240926 - Shirley)
  const session = await getSession(req, res);
  const { userId } = session;

  const { query } = validateRequest(APIName.LEDGER_LIST_V2, req, userId);

  if (query) {
    // TODO: 實作 API 時補上 (20240926 - Shirley)
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      startDate,
      endDate,
      startAccountNo,
      endAccountNo,
      labelType,
      page,
      pageSize,
      sortOrder,
    } = query;

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      currency: 'TWD',
      items: {
        data: mockLedgerList,
        page: page ?? 1,
        totalPages: 1,
        totalCount: mockLedgerList.length,
        pageSize: pageSize ?? mockLedgerList.length,
        hasNextPage: false,
        hasPreviousPage: false,
        sort: [
          {
            sortBy: 'no',
            sortOrder: 'asc',
          },
        ],
      },
      totalDebitAmount: 2300000,
      totalCreditAmount: 1300000,
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
