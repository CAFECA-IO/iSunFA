import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, kickDevice } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { HttpMethod } from '@/constants/api_connection';

/* Info: (20250111 - Luphia) 列出用戶所有登入裝置
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 檢查用戶 input (使用 zod)
 * 4. 具體實作的商業邏輯：根據 deviceId 踢除指定 Device
 * 5. 紀錄 user action log
 * 6. 整理例外狀況，紀錄重大異常
 * 7. 格式化 API 回傳資料
 * 8. 回傳操作結果
 */
const handleDeleteRequest = async (req: NextApiRequest) => {
  const targetDeviceId = req.query.deviceId as string;
  const statusMessage = STATUS_MESSAGE.SUCCESS;
  const session = await getSession(req);
  await kickDevice(session, targetDeviceId);
  const payload: unknown[] = [];
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
      case HttpMethod.DELETE:
        ({ httpCode, result } = await handleDeleteRequest(req));
        break;
      default:
        // Info: (20250113 - Luphia) unsupported method
        httpCode = HTTP_STATUS.METHOD_NOT_ALLOWED;
        result = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, []);
    }
  } catch (error) {
    // Info: (20250113 - Luphia) unexpected exception, pass to global handler
    (error as Error).message += ` | Method: ${method} | Path: ${req.url}`;
  }

  res.status(httpCode).json(result);
}
