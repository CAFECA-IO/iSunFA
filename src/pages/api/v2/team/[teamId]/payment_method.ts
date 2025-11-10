import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { IPaymentMethod } from '@/interfaces/payment';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { HttpMethod } from '@/constants/api_connection';

/* Info: (20250111 - Luphia) 列出用戶所有登入裝置
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 檢查用戶 input (使用 zod)
 * 4. 具體實作的商業邏輯：獲取團隊支付設定（即信用卡資訊）
 * 5. 紀錄 user action log
 * 6. 歸納例外狀況並拋出錯誤
 * 7. 格式化 API 回傳資料
 * 8. 回傳操作結果
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const statusMessage = STATUS_MESSAGE.SUCCESS;
  // Deprecated: (20250117 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const session = await getSession(req);

  // Info: (20250117 - Luphia) mock data
  const payload: IPaymentMethod[] = [
    /*
    {
      id: 10000001,
      type: PAYMENT_METHOD_TYPE.VISA,
      number: '**** **** **** 1234',
      expirationDate: '12/25',
      cvv: '123',
      default: true,
    },
    */
  ];
  const result = formatApiResponse(statusMessage, payload);
  return result;
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
    (error as Error).message += ` | Method: ${method} | Path: ${req.url}`;
  }

  res.status(httpCode).json(result);
}
