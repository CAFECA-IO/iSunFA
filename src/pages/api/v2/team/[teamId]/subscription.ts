import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { updateSubscription } from '@/lib/services/subscription_service'; // Info: (20250114 - Tzuhan) 假設此處包含資料庫更新邏輯
import { IUserOwnedTeam, TPlanType } from '@/interfaces/subscription';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IResponseData } from '@/interfaces/response_data';
import { IHandleRequest } from '@/interfaces/handleRequest';

/* Info: (20250114 - Tzuhan) 更新團隊訂閱計劃
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 驗證輸入資料
 * 4. 實現商業邏輯：更新指定團隊的訂閱計劃及自動續約狀態
 * 5. 格式化 API 回傳資料
 * 6. 回傳結果
 */
const handlePutRequest: IHandleRequest<
  APIName.UPDATE_SUBSCRIPTION,
  IUserOwnedTeam | null
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IUserOwnedTeam | null = null;

  // Info: (20250114 - Tzuhan) Step 2: 驗證輸入資料
  // Info: (20250114 - Tzuhan) Step 3: 呼叫商業邏輯進行更新
  const { plan, autoRenew } = body;
  try {
    const { success, error, data } = await updateSubscription(
      query.teamId,
      plan as TPlanType,
      autoRenew
    );
    if (success && data) {
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      payload = data;
    } else {
      statusMessage = error || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IUserOwnedTeam | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.UPDATE_SUBSCRIPTION, req, handlePutRequest),
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
