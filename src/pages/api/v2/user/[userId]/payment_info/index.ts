import { NextApiRequest, NextApiResponse } from 'next';
import {
  BindCardQuerySchema,
  getDefaultUserPaymentInfo,
} from '@/lib/utils/repo/user_payment_info.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { HttpMethod } from '@/constants/api_connection';
import { HTTP_STATUS } from '@/constants/http';
import { getSession } from '@/lib/utils/session';
import { z } from 'zod';
import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import loggerBack from '@/lib/utils/logger_back';

// Info: (20250218 - tzuhan) 取得用戶登錄支付憑證請求格式檢驗
export const handleGetRequestInputValiditor = z.object({
  userId: z.number(),
});

// Info: (20250218 - tzuhan) 取得用戶登錄支付憑證回傳格式檢驗，允許為 null
export const handleGetRequestOutputValiditor = z
  .object({
    id: z.number(),
    type: z.enum(Object.keys(PAYMENT_METHOD_TYPE) as [string, ...string[]]),
    number: z.string(),
    expirationDate: z.string(),
    cvv: z.string(),
    default: z.boolean(),
  })
  .nullable();

/** Info: (20250311 - Luphia) 取得用戶登錄支付憑證的流程
 *  1. 檢驗是否提供足夠的參數
 *  2. 檢驗用戶使否具備足夠權限
 *  3. 搜尋資料庫取得用戶的支付憑證
 *  4. 回傳用戶的支付憑證，若無則回傳 null
 */
const handleGetRequest = async (req: NextApiRequest) => {
  // Info: (20250311 - Luphia) 解構賦值取得 userId
  const { userId } = req.query;
  const userIdNumber: number = Number(userId);
  // Info: (20250311 - Luphia) 確認操作用戶是否具備足夠權限
  const session = await getSession(req);
  loggerBack.info(`session: ${JSON.stringify(session)}`);
  if (session.userId !== userIdNumber) throw new Error(STATUS_MESSAGE.UNAUTHORIZED_ACCESS);
  // Info: (20250311 - Luphia) 透過 Zod Schema 驗證是否提供足夠的參數
  BindCardQuerySchema.parse({ userId: userIdNumber });
  // Info: (20250311 - Luphia) 搜尋資料庫取得用戶的支付憑證
  const paymentInfo = await getDefaultUserPaymentInfo(userIdNumber);
  const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, paymentInfo);
  return result;
};

// Info: (20250311 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      default:
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (error) {
    const { message } = error as Error;
    loggerBack.error(message);
    ({ httpCode, result } = formatApiResponse(message, {}));
  }

  return res.status(httpCode).json(result);
}
