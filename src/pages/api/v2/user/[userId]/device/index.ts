import { STATUS_MESSAGE } from '@/constants/status_code';
import { HttpMethod } from '@/constants/api_connection';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, listDevice } from '@/lib/utils/session';
import { ILoginDevice } from '@/interfaces/login_device';
import { HTTP_STATUS } from '@/constants/http';
import { IPaginatedData, IPaginatedOptions } from '@/interfaces/pagination';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';

/* Info: (20250111 - Luphia) 列出用戶所有登入裝置
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 檢查用戶 input (使用 zod)
 * 4. 具體實作的商業邏輯：列出所有相同 uid 的登入裝置資訊，含裝置名稱、裝置型號、登入時間、登入 IP、登入位置、session ID
 * 5. 紀錄 user action log
 * 6. 整理例外狀況，紀錄重大異常
 * 7. 格式化 API 回傳資料
 * 8. 回傳操作結果
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const statusMessage = STATUS_MESSAGE.SUCCESS;
  // Info: (20250113 - Luphia) step 1
  const session = await getSession(req);
  const deviceList: ILoginDevice[] = await listDevice(session);
  const options: IPaginatedOptions<ILoginDevice[]> = {
    data: deviceList,
  };
  const payload: IPaginatedData<ILoginDevice[]> = toPaginatedData(options);
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
