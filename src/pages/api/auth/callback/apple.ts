import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';
import { getAuthOptions } from '@/pages/api/auth/[...nextauth]';
import { Account } from 'next-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Method+Not+Allowed`);
    return;
  }

  const { code, error } = req.body;

  if (error) {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code) {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Missing+authorization+code`);
    return;
  }

  try {
    const { user, account } = await handleAppleOAuth(code);
    await handleSignInSession(req, res, user, account);

    const authOptions = getAuthOptions(req, res);
    if (authOptions.callbacks && authOptions.callbacks.jwt) {
      loggerBack.info('call authOptions.callbacks.jwt', authOptions.callbacks.jwt);
      await authOptions.callbacks.jwt({
        token: {},
        user,
        account: account as Account,
        profile: undefined,
        isNewUser: false,
      });
    } else {
      loggerBack.info('is not call authOptions.callbacks.jwt', authOptions?.callbacks?.jwt || {});
      loggerError(
        -1,
        'authOptions?.callbacks?.jwt',
        JSON.stringify(authOptions?.callbacks?.jwt || {})
      );
    }

    // Info: (20241127 - tzuhan) 登錄成功，重定向到 LOGIN，帶 signin=true
    const redirectUrl = ISUNFA_ROUTE.LOGIN;
    res.redirect(`${redirectUrl}?signin=true`);
  } catch (err) {
    // Info: (20241127 - tzuhan) 錯誤處理
    loggerError(-1, 'Apple sign-in failed', err as Error);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const userFriendlyMessage = errorMessage.includes('Token exchange failed')
      ? 'Failed to authenticate with Apple.'
      : 'An unexpected error occurred.';
    res.redirect(
      `${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent(userFriendlyMessage)}`
    );
  }
}
