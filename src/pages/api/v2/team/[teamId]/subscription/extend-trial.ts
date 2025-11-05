import { NextApiRequest, NextApiResponse } from 'next';
import { updateSubscription } from '@/lib/utils/repo/team_subscription.repo';
import { TPlanType } from '@/interfaces/subscription';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { HTTP_STATUS } from '@/constants/http';
import { getSession } from '@/lib/utils/session';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Info: (20251105 - Tzuhan) 1. 檢查請求方法
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
      message: STATUS_MESSAGE.METHOD_NOT_ALLOWED,
      errorCode: STATUS_CODE.METHOD_NOT_ALLOWED,
    });
  }

  const session = await getSession(req);
  const userId = session?.userId;
  const { teamId } = req.query;

  // Info: (20251105 - Tzuhan) 2. 驗證使用者身份
  if (!userId) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: STATUS_MESSAGE.UNAUTHORIZED_ACCESS,
      errorCode: STATUS_CODE.UNAUTHORIZED_ACCESS,
    });
  }

  try {
    // Info: (20251105 - Tzuhan) 3. 呼叫現有的 repo 函式
    // Info: (20251105 - Tzuhan) updateSubscription 內部已包含 assertUserCan 權限檢查，因此這裡不需要重複檢查
    const updatedTeamSubscription = await updateSubscription(Number(userId), Number(teamId), {
      plan: TPlanType.TRIAL,
    });

    // Info: (20251105 - Tzuhan) 4. 成功回應
    return formatApiResponse(STATUS_MESSAGE.SUCCESS, updatedTeamSubscription);
  } catch (error) {
    // Info: (20251105 - Tzuhan) 5. 捕捉 repo 拋出的錯誤，這將捕捉 updateSubscription 內部 assertUserCan 拋出的權限錯誤
    loggerError({
      userId: userId || DefaultValue.USER_ID.GUEST,
      errorType: 'Internal Server Error, handler auth error failed',
      errorMessage: (error as Error).message,
    });

    const errorMessage = (error as Error).message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;

    return formatApiResponse(errorMessage, null);
  }
}
