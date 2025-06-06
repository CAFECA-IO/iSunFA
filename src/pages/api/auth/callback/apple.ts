import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';
import { DefaultValue } from '@/constants/default_value';
import { HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== HttpMethod.POST) {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Method+Not+Allowed`);
    return;
  }

  const { code } = req.body;

  if (!code) {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Missing+authorization+code`);
    return;
  }

  try {
    // Info: (20250114 - Luphia) Step 0: generate session id in cookie.isunfa
    const session = await getSession(req);
    res.setHeader('isunfa', session.isunfa);

    // Info: (20241129 - tzuhan) Step 1: Handle Apple OAuth
    const { user, account } = await handleAppleOAuth(code);
    await handleSignInSession(req, user, account);

    // Info: (20241129 - tzuhan) Step 2: Redirect on Success
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=true`);
  } catch (error) {
    const errorObject = error as Error;
    const errorInfo = {
      userId: DefaultValue.USER_ID.GUEST,
      errorType: 'Apple sign-in failed',
      errorMessage: errorObject.message,
    };
    loggerError(errorInfo);
    res.redirect(
      `${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent('Sign-in failed')}`
    );
  }
}
