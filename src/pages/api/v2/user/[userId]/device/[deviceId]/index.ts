import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, kickDevice } from '@/lib/utils/session';
import { IResponseData } from '@/interfaces/response_data';

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
  const result = { statusMessage, payload };
  return result;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<unknown[]>>
) {
  const method = req.method || 'GET';
  let statusMessage;
  let payload: unknown[] = [];

  try {
    switch (method) {
      case 'DELETE':
        ({ statusMessage, payload } = await handleDeleteRequest(req));
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  const { httpCode, result } = formatApiResponse(statusMessage, payload);
  res.status(httpCode).json(result);
}
