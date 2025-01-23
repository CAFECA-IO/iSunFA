import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

interface ISuggestedNumberPayload {
  assetNumber: string;
}

interface IResponse {
  statusMessage: string;
  payload: ISuggestedNumberPayload | null;
}

export const MOCK_SUGGESTED_NUMBER: ISuggestedNumberPayload = {
  assetNumber: 'EQ-000123',
};

export async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISuggestedNumberPayload | null = null;

  try {
    const { assetType } = req.query;

    if (!assetType || typeof assetType !== 'string') {
      // TODO: (20241029 - Shirley) 更改錯誤訊息，如資產類型不存在
      statusMessage = STATUS_MESSAGE.BAD_REQUEST;
      return { statusMessage, payload };
    }

    // ToDo: (20241029 - Shirley) 從資料庫獲取最後一個資產編號
    // ToDo: (20241029 - Shirley) 根據資產類型生成新的資產編號
    payload = MOCK_SUGGESTED_NUMBER;
    statusMessage = STATUS_MESSAGE.SUCCESS;
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ISuggestedNumberPayload | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ISuggestedNumberPayload | null = null;

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
    const { httpCode, result } = formatApiResponse<ISuggestedNumberPayload | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
