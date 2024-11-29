import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { encode } from 'next-auth/jwt';
import { getAuthOptions } from '@/pages/api/auth/[...nextauth]';
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

    // Info: (20241129 - tzuhan) Step 2: Load NextAuth options
    const authOptions = getAuthOptions(req, res);

    if (authOptions.callbacks?.jwt) {
      // Info: (20241129 - tzuhan) Generate JWT Token
      const token = await authOptions.callbacks.jwt({
        token: {},
        user,
        account,
      });

      loggerBack.info('Generated JWT Token', token);

      // Info: (20241129 - tzuhan) Set Session Cookie
      const tokenExpiry = parseInt(process.env.APPLE_TOKEN_EXPIRY || '3600', 10);
      const sessionToken = await encode({
        token,
        secret: process.env.NEXTAUTH_SECRET!,
        maxAge: tokenExpiry,
      });

      res.setHeader(
        'Set-Cookie',
        `next-auth.session-token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenExpiry}`
      );

      loggerBack.info('Session cookie set successfully');

      // Info: (20241129 - tzuhan) Call Session Callback
      if (authOptions.callbacks?.session) {
        const sessionResult = await authOptions.callbacks.session({
          session: {
            user: {
              email: token.email,
            },
            expires: new Date(Date.now() + tokenExpiry * 1000).toISOString(),
          },
          token,
          user,
          newSession: undefined,
          trigger: 'update',
        });

        loggerBack.info('Generated Session Object', sessionResult);
      }
    }

    // Info: (20241129 - tzuhan) Step 3: Redirect on Success
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=true`);
  } catch (error) {
    loggerError(-1, 'Apple sign-in failed', error as Error);
    res.redirect(
      `${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent('Sign-in failed')}`
    );
  }
}
