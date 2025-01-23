import { destroySession, getSession } from '@/lib/utils/session';
import { NextApiRequest } from 'next';

import { APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { DefaultValue } from '@/constants/default_value';

export const handleSignOutSession = async (req: NextApiRequest) => {
  const session = await getSession(req);

  // Info: (20250108 - Luphia) If there is no user_id, it will be considered as a guest and no need to log out
  if (!session.userId || session.userId === DefaultValue.USER_ID.GUEST) {
    return;
  }

  await createUserActionLog({
    sessionId: session.isunfa,
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
