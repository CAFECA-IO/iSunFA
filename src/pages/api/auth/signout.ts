import type { NextApiRequest, NextApiResponse } from 'next';
import { destroySession, getSession } from '@/lib/utils/session';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ISUNFA_ROUTE } from '@/constants/url';
import { loggerError } from '@/lib/utils/logger_back';
import { APIPath } from '@/constants/api_connection';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    const referer = req.headers.referer || ISUNFA_ROUTE.LOGIN; // 如果沒有 Referer，默認重定向到登入頁
    res.redirect(`${referer}?signout=false&error=${encodeURIComponent('Method Not Allowed')}`);
    return;
  }

  try {
    let sessionCleared = false;

    const session = await getSession(req, res);
    if (session) {
      await createUserActionLog({
        sessionId: session.id,
        userId: session.userId,
        actionType: UserActionLogActionType.LOGOUT,
        actionDescription: UserActionLogActionType.LOGOUT,
        ipAddress: (req.headers['x-forwarded-for'] as string) || '',
        userAgent: (req.headers['user-agent'] as string) || '',
        apiEndpoint: APIPath.SIGN_OUT,
        httpMethod: req.method || '',
        requestPayload: {},
        statusMessage: STATUS_MESSAGE.SUCCESS,
      });
      destroySession(session);

      sessionCleared = true;
    }

    if (sessionCleared) {
      res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false`);
    } else {
      res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=No+active+session+to+clear`);
    }
  } catch (error) {
    loggerError(-1, 'Error in signout:', error as Error);
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent('Logout failed')}`);
  }
}
