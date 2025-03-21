import { NextApiRequest, NextApiResponse } from 'next';
import { HTTP_STATUS } from '@/constants/http';
import { HttpMethod } from '@/constants/api_connection';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import { createDefaultUserPaymentInfo } from '@/lib/utils/repo/user_payment_info.repo';
import { z } from 'zod';
import { IPaymentGateway } from '@/interfaces/payment_gateway';
import { PAYMENT } from '@/constants/service';

// Info: (20250319 - Luphia) Input Schema
const inputSchema = z.object({
  success: z.string(),
  purpose: z.string(),
  merchantId: z.string(),
  transactionId: z.string(),
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
const handleGetRequest = async (req: NextApiRequest) => {
  // Info: (20250113 - Luphia) step 1 此為 oen 的 callback api，不需要 session

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
  const { query, body } = req;
  const validatedBody = inputSchema.safeParse(body);
  const { data } = validatedBody;
  let success = !!query.success;
  let paymentInfo;

  if (success && data) {
    const paymentGatewayOptions = {
      platform: PAYMENT.OEN,
      prodMode: false, // process.env.NODE_ENV === 'production',
      id: process.env.PAYMENT_ID as string,
      secret: process.env.PAYMENT_TOKEN as string,
    };
    const paymentGateway: IPaymentGateway = createPaymentGateway(paymentGatewayOptions);
    paymentInfo = paymentGateway.parseAuthorizationToken(data);
    success = !!query.success;
  } else {
    success = false;
  }

  if (success && paymentInfo) {
    const createResult = await createDefaultUserPaymentInfo(paymentInfo);
    success = !!createResult;
  } else {
    success = false;
  }

  // ToDo: (20250318 - Luphia) 使 window.opener 能夠知道綁定結果
  const response = {
    httpCode: HTTP_STATUS.OK,
    result: generateResponseTemplate(success),
  };
  return response;
};

/* Info: (20250113 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
 * 補充說明： API Router 不應該決定 Response 格式與商業邏輯，只負責呼叫對應的流程
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;

  try {
    switch (method) {
      case HttpMethod.GET:
      default:
        ({ httpCode, result } = await handleGetRequest(req));
    }
  } catch (error) {
    // Info: (20250113 - Luphia) unexpected exception, pass to global handler
  }

  res.statusCode = httpCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write(result);
  res.end();
}
