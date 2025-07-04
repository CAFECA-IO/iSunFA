import { NextApiRequest, NextApiResponse } from 'next';
// Deprecated: (20250509 - Luphia) remove eslint-disable
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { APIName, HttpMethod } from '@/constants/api_connection';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { getExternalUserByProviderAndUid } from '@/lib/utils/repo/external_user.repo';
import { getReportByUserId } from '@/lib/utils/repo/report.repo';

/* Info: (20250702 - Luphia) 根據外部用戶資料取得公開帳本路徑
 * 1. 根據 external provider 與 uid 取得 user 與其擁有 team 資訊
 * 2. 根據 team 資訊取得 company 資訊
 * 3. 將 company 資訊整理為以下格式
 * [{
 *    name: "帳本名稱",
 *    balance: "https://isunfa.tw/embed/view/10002751?report_type=balance",
 *    cashFlow: "https://isunfa.tw/embed/view/10002750?report_type=cash-flow",
 *    comprehensiveIncome: "https://isunfa.tw/embed/view/10002749?report_type=comprehensive-income"
 * }]
 */
export const handleGetRequest = async (req: NextApiRequest) => {
  const { query } = req;
  const { external, uid } = query;
  // Info: (20250702 - Luphia) 檢查是否有提供 external 與 uid
  if (!external || !uid) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }

  // Info: (20250702 - Luphia) Step 1: 根據 external 與 uid 取得 External User 資訊
  const externalUser = await getExternalUserByProviderAndUid({
    externalProvider: external as string,
    externalId: uid as string,
  });
  const userId = externalUser?.user?.id || 0;

  // Info: (20250703 - Julian) Step 2: 根據 User Id 取得報表資料
  const reportLinks = await getReportByUserId({ userId });

  // ToDo: (20250702 - Luphia) 繼續完成其他流程
  const result = {
    statusMessage: STATUS_MESSAGE.SUCCESS_GET,
    result: reportLinks,
  };
  return result;
};

/* Info: (20250113 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
 * 補充說明： API Router 不應該決定 Response 格式與商業邏輯，只負責呼叫對應的流程
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const method = req.method || HttpMethod.GET;
  let httpCode;
  let result;
  let statusMessage;

  try {
    switch (method) {
      case HttpMethod.GET:
      default:
        ({ statusMessage, result } = await handleGetRequest(req));
    }
    ({ httpCode, result } = formatApiResponse(statusMessage, result));
    res.status(httpCode).json(result);
  } catch (error) {
    loggerBack.error(error);
    const err = error as Error;
    statusMessage = err.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, {}));
    res.status(httpCode).json(result);
  }
  // ToDo: (20250509 - Luphia) 需補充 logUserAction 格式
  /*
  await logUserAction(
    session,
    APIName.PAYMENT_METHOD_REGISTER_REDIRECT,
    req,
    statusMessage as string
  );
   */
  res.end();
};

export default handler;
