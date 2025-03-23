import { NextApiRequest, NextApiResponse } from 'next';
import { HTTP_STATUS } from '@/constants/http';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import { createDefaultUserPaymentInfo } from '@/lib/utils/repo/user_payment_info.repo';
import { z } from 'zod';
import { IPaymentGateway } from '@/interfaces/payment_gateway';
import { PAYMENT } from '@/constants/service';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { logUserAction } from '@/lib/utils/middleware';

// Info: (20250319 - Luphia) Input Schema
const inputSchema = z.object({
  success: z.boolean(),
  purpose: z.string(),
  merchantId: z.string(),
  transactionId: z.string(),
  message: z.string().nullable(),
  customId: z.string(),
  token: z.string(),
  id: z.string(),
});

// Info: (20250319 - Luphia) 綁定結果用的 HTML Template，通知 window.opener 並關閉
const generateResponseTemplate = (success: boolean) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Binding Result</title>
    </head>
    <body>
      <h1>Binding Result: '${success}'</h1>
      <script>
        window.opener.postMessage('${success}', window.location.origin);
        window.close();
      </script>
    </body>
  </html>
`;

/* Info: (20250319 - Luphia) 應援科技將用戶導向此頁面
 * 1. 根據參數判斷執行成功與否
 * 2. 回傳 HTML Template 通知 window.opener
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const { query } = req;
  const success = !!query.success;
  const response = generateResponseTemplate(success);
  const result = {
    httpCode: HTTP_STATUS.OK,
    result: response,
  };
  return result;
};

/* Info: (20250111 - Luphia) 應援科技回傳綁定結果
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 檢查用戶 input (使用 zod)
 * 4. 具體實作的商業邏輯：獲取 oen 回傳資訊
 * 5. 紀錄 user action log
 * 6. 整理例外狀況，紀錄重大異常
 * 7. 格式化 API 回傳資料
 * 8. 回傳操作結果
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const { body } = req;
  let success = !!body?.success;
  let paymentInfo;

  try {
    // Info: (20250113 - Luphia) step 1 此為 oen 的 callback api，不需要 session

    // ToDo: (202500321 - Luphia) step 2 檢驗來源為應援科技

    /** Info: (20250113 - Luphia) step 4
     *  {
     *    success: true,
     *    purpose: "token",
     *    merchantId: "mermer",
     *    transactionId: "2ttQvgJNV6YpVZA5KNoxgwwdeWb",
     *    message: null,
     *    customId: "10000001",
     *    token: "2ttR0HQ12YH4wiB0tH1nk2C1nEp",
     *    id: "2ttQvgJNV6YpVZA5KNoxgwwdeWb",
     *  }
     */
    const validatedBody = inputSchema.safeParse(body);
    const { data } = validatedBody;

    if (success && data) {
      const paymentGatewayOptions = {
        platform: PAYMENT.OEN,
        prodMode: false, // process.env.NODE_ENV === 'production',
        id: process.env.PAYMENT_ID as string,
        secret: process.env.PAYMENT_TOKEN as string,
      };
      const paymentGateway: IPaymentGateway = createPaymentGateway(paymentGatewayOptions);
      paymentInfo = paymentGateway.parseAuthorizationToken(data);
    } else {
      success = false;
    }

    if (success && paymentInfo) {
      const createResult = await createDefaultUserPaymentInfo(paymentInfo);
      success = !!createResult;
    } else {
      success = false;
    }
  } catch (error) {
    // Info: (20250321 - Luphia) unexpected exception, pass to global
    loggerBack.error(error);
  }

  // ToDo: (20250318 - Luphia) 使 window.opener 能夠知道綁定結果
  const response = formatApiResponse(STATUS_MESSAGE.SUCCESS, body);
  return response;
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

  try {
    switch (method) {
      case HttpMethod.POST:
        ({ httpCode, result } = await handlePostRequest(req));
        res.status(httpCode).json(result);
        break;
      case HttpMethod.GET:
      default:
        ({ httpCode, result } = await handleGetRequest(req));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(httpCode).write(result);
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
    APIName.PAYMENT_METHOD_REGISTER_CALLBACK_OEN,
    req,
    statusMessage as string
  );
  res.end();
}
