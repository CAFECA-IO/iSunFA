import { NextApiRequest, NextApiResponse } from 'next';
import { HTTP_STATUS } from '@/constants/http';
import { PAYMENT } from '@/constants/service';
import { getSession } from '@/lib/utils/session';

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

  // Info: (20250113 - Luphia) step 4
  const paymentToken = process.env.PAYMENT_TOKEN as string;
  const paymentId = process.env.PAYMENT_ID as string;
  const oenGetIdApi =
    process.env.NODE_ENV === 'development'
      ? 'https://payment-api.testing.oen.tw/checkout-token'
      : 'https://payment-api.oen.tw/checkout-token';
  const oenPaymentUrl =
    process.env.NODE_ENV === 'development'
      ? `https://${paymentId}.testing.oen.tw/checkout/subscription/create/`
      : `https://${paymentId}.oen.tw/checkout/subscription/create/`;
  const successUrl =
    new URL('/api/payment/callback/oen', process.env.NEXTAUTH_URL) + '?success=true';
  const failureUrl = new URL('/api/payment/callback/oen', process.env.NEXTAUTH_URL) + '?failure';
  // Info: (20250114 - Luphia) POST request to get payment id with Bearer token in header and json body
  const options = {
    merchantId: paymentId,
    successUrl,
    failureUrl,
    customId: userId,
  };

  const response = await fetch(oenGetIdApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${paymentToken}`,
    },
    body: JSON.stringify(options),
  });

  const oenResponse = await response.json();
  const url = oenPaymentUrl + oenResponse.data.id;
  const httpCode = 302;
  // Info: (20250113 - Luphia) step 7
  const result = { httpCode, result: url };
  return result;
};

/* Info: (20250113 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
 * 補充說明： API Router 不應該決定 Response 格式與商業邏輯，只負責呼叫對應的流程
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET';
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let paymentHandler;
  const paymentService = process.env.PAYMENT_SERVICE;

  try {
    switch (paymentService) {
      case PAYMENT.OEN:
      default:
        paymentHandler = oenPaymentHandler;
    }

    switch (method) {
      case 'GET':
      default:
        ({ httpCode, result } = await paymentHandler(req));
    }
  } catch (error) {
    // Info: (20250113 - Luphia) unexpected exception, pass to global handler
  }

  res.writeHead(httpCode, { Location: result });
  res.end();
}
