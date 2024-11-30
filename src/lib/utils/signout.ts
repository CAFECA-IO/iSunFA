import { destroySession, getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

import { APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';

export const handleSignOutSession = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

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
};
