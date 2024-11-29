import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  loggerBack.info('custom signOut is called', req.body);
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
    res.redirect(`$ {ISUNFA_ROUTE.LOGIN}?signin=false&error=Missing+authorization+code`);
    return;
  }

  try {
    const { user, account } = await handleAppleOAuth(code);
    await handleSignInSession(req, res, user, account);

    res.status(200).json({ success: true, message: 'Successfully signed out' });
  } catch (err) {
    // Info: (20241127 - tzuhan) 錯誤處理
    loggerError(-1, 'Apple sign-in failed', err as Error);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const userFriendlyMessage = errorMessage.includes('Token exchange failed')
      ? 'Failed to authenticate with Apple.'
      : 'An unexpected error occurred.';
    res.status(500).json({ success: false, message: userFriendlyMessage });
  }
}
