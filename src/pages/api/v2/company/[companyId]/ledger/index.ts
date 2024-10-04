import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILedgerPayload, MOCK_RESPONSE } from '@/interfaces/ledger';

interface IPayload extends ILedgerPayload {}

interface IResponse {
  statusMessage: string;
  payload: IPayload | null;
}

// ToDo: (20240927 - Shirley) 從資料庫獲取分類帳資料的邏輯
export async function handleGetRequest() {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

  // ToDo: (20240927 - Shirley) 從請求中獲取session資料
  // ToDo: (20240927 - Shirley) 檢查用戶是否有權訪問此API
  // ToDo: (20240927 - Shirley) 從請求參數中獲取startDate, endDate, startAccountNo, endAccountNo, labelType, page, pageSize
  // ToDo: (20240927 - Shirley) 從資料庫獲取分類帳資料的邏輯
  // ToDo: (20240927 - Shirley) 將分類帳資料格式化為ILedgerItem介面

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
