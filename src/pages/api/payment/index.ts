import { NextApiRequest, NextApiResponse } from 'next';
import { PAYMENT } from '@/constants/service';
import { getSession } from '@/lib/utils/session';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import { IGetCardBindingUrlOptions, IPaymentGateway } from '@/interfaces/payment_gateway';
import { logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';

/* Info: (20250111 - Luphia) 導向綁定信用卡頁面
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 檢查用戶 input (使用 zod)
 * 4. 具體實作的商業邏輯：獲取 payment id 並建立信用卡登記網址，將用戶轉往該網址
 * 5. 紀錄 user action log
 * 6. 整理例外狀況，紀錄重大異常
 * 7. 格式化 API 回傳資料
 * 8. 回傳操作結果
 */
export const oenPaymentHandler = async (req: NextApiRequest) => {
  // Info: (20250113 - Luphia) step 1
  const session = await getSession(req);
  const { userId } = session;

  // Info: (20250318 - Luphia) step 2 只要有登入 userId 即可操作

  // Info: (20250318 - Luphia) step 3 沒有 input

  // Info: (20250113 - Luphia) step 4
  const paymentGateway = createPaymentGateway() as IPaymentGateway;

  const getCardBindingUrlOptions: IGetCardBindingUrlOptions = {
    successUrl: new URL('/api/payment/callback/oen', process.env.NEXTAUTH_URL) + '?success=true',
    failureUrl: new URL('/api/payment/callback/oen', process.env.NEXTAUTH_URL) + '?failure',
    customId: userId?.toString(),
  };
  const cardBindingUrl = await paymentGateway.getCardBindingUrl(getCardBindingUrlOptions);
  const httpCode = 302;
  // Info: (20250113 - Luphia) step 7
  const result = { httpCode, result: cardBindingUrl };
  // Info: (20250318 - Luphia) step 8
  return result;
};

/* Info: (20250113 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
 * 補充說明： API Router 不應該決定 Response 格式與商業邏輯，只負責呼叫對應的流程
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  const session = await getSession(req);
  let httpCode;
  let result;
  let statusMessage;
  let paymentHandler;
  const paymentService = process.env.PAYMENT_SERVICE;

  try {
    switch (paymentService) {
      case PAYMENT.OEN:
      default:
        paymentHandler = oenPaymentHandler;
    }

    switch (method) {
      case HttpMethod.GET:
      default:
        ({ httpCode, result } = await paymentHandler(req));
        res.writeHead(httpCode, { Location: result });
    }
  } catch (error) {
    loggerBack.error(error);
    const err = error as Error;
    statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    ({ httpCode, result } = formatApiResponse(statusMessage, {}));
    res.status(httpCode).json(result);
  }
  await logUserAction(
    session,
    APIName.PAYMENT_METHOD_REGISTER_REDIRECT,
    req,
    statusMessage as string
  );
  res.end();
}
