import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession, listDevice } from '@/lib/utils/session';
import { ILoginDevice } from '@/interfaces/login_device';
import { IResponseData } from '@/interfaces/response_data';

/* Info: (20250111 - Luphia) 列出用戶所有登入裝置
 * 1. 取得 Session 資訊
 * 2. 檢驗是否具備操作權限
 * 3. 列出所有相同 uid 的登入裝置資訊，含裝置名稱、裝置型號、登入時間、登入 IP、登入位置、session ID
 * 4. 回傳操作結果
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const statusMessage = STATUS_MESSAGE.SUCCESS;
  const session = await getSession(req);
  const payload: ILoginDevice[] = await listDevice(session);
  const result = { statusMessage, payload };
  return result;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILoginDevice[]>>
) {
  const method = req.method || 'GET';
  let statusMessage;
  let payload: ILoginDevice[] = [];

  try {
    switch (method) {
      case 'GET':
      default:
        ({ statusMessage, payload } = await handleGetRequest(req));
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  const { httpCode, result } = formatApiResponse(statusMessage, payload);
  res.status(httpCode).json(result);
}
