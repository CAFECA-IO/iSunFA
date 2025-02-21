import { NextApiRequest, NextApiResponse } from 'next';
import { HTTP_STATUS } from '@/constants/http';
import { HttpMethod } from '@/constants/api_connection';

/* Info: (20250111 - Luphia) 應援科技回傳綁定結果，原則上必定成功
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

  // Info: (20250113 - Luphia) step 4
  const { query } = req;
  // Deprecated: (20250119 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const success = !!query.success;

  // Info: (20250114 - Luphia) 設定成功時與失敗時需要導向的前端網址
  const redirectUrl = '/payment/callback';

  const result = { httpCode: 302, result: redirectUrl };
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
  }

  res.writeHead(httpCode, { Location: result });
  res.end();
}
