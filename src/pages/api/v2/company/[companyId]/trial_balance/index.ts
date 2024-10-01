import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IPaginatedData } from '@/interfaces/pagination';
import { TrialBalanceItem, ITotal } from '@/interfaces/trial_balance';

interface IPayload {
  currency: string;
  items: IPaginatedData<TrialBalanceItem[]>;
  total: ITotal;
}

interface IResponse {
  statusMessage: string;
  payload: IPayload | null;
}

export const MOCK_RESPONSE: IPayload = {
  currency: 'TWD',
  items: {
    data: [
      {
        id: 1,
        no: '1141',
        accountingTitle: '應收帳款',
        beginningCreditAmount: 0,
        beginningDebitAmount: 1785000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 1785000,
        endingCreditAmount: 0,
        endingDebitAmount: 1785000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [
          {
            id: 2,
            no: '114101',
            accountingTitle: '應收帳款-A公司',
            beginningCreditAmount: 0,
            beginningDebitAmount: 1785000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 1785000,
            endingCreditAmount: 0,
            endingDebitAmount: 1785000,
            createAt: 1704067200,
            updateAt: 1704067200,
            subAccounts: [],
          },
        ],
      },
      {
        id: 3,
        no: '1151',
        accountingTitle: '其他應收款',
        beginningCreditAmount: 0,
        beginningDebitAmount: 500000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 500000,
        endingCreditAmount: 0,
        endingDebitAmount: 500000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [],
      },
    ],
    page: 1,
    totalPages: 1,
    totalCount: 2,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [
      {
        sortBy: 'no',
        sortOrder: 'asc',
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
    createAt: 1704067200,
    updateAt: 1704067200,
  },
};

// ToDo: (20240927 - Shirley) 從資料庫獲取試算表資料的邏輯
export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取session資料
  // ToDo: (20240927 - Shirley) 檢查用戶是否有權訪問此API
  // ToDo: (20240927 - Shirley) 從資料庫獲取試算表資料的邏輯
  // ToDo: (20240927 - Shirley) 將試算表資料格式化為TrialBalanceItem介面

  // Deprecated: (20241010 - Shirley) 連接的模擬資料
  payload = MOCK_RESPONSE;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPayload | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

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
    const { httpCode, result } = formatApiResponse<IPayload | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
