import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Method+Not+Allowed`);
    return;
  }

  const { code } = req.body;

  if (!code) {
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=Missing+authorization+code`);
    return;
  }

  try {
    // Info: (20241129 - tzuhan) Step 1: Handle Apple OAuth
    const { user, account } = await handleAppleOAuth(code);
    await handleSignInSession(req, res, user, account);

    // Info: (20241129 - tzuhan) Step 3: Redirect on Success
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=true`);
  } catch (error) {
    loggerError(-1, 'Apple sign-in failed', error as Error);
    res.redirect(
      `${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent('Sign-in failed')}`
    );
  }
}
