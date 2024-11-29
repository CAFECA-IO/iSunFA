import type { NextApiRequest, NextApiResponse } from 'next';
import { handleAppleOAuth } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';
import { encode } from 'next-auth/jwt';

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

    /**
    const authOptions = getAuthOptions(req, res);
    if (authOptions.callbacks && authOptions.callbacks.jwt) {
      loggerBack.info('call authOptions.callbacks.jwt', authOptions.callbacks.jwt);
      const token = await authOptions.callbacks.jwt({
        token: {},
        user,
        account: account as Account,
        profile: undefined,
        isNewUser: false,
      });
      const session = await getServerSession(req, res, authOptions);
      if (session && authOptions.callbacks.session) {
        loggerBack.info('call authOptions.callbacks.session', authOptions.callbacks.jwt);
        await authOptions.callbacks.session({
          session: {
            user: {},
            expires: '',
          },
          token,
          user: user as AdapterUser,
          newSession: undefined,
          trigger: 'update',
        });
      } else {
        loggerBack.info(
          'is not call authOptions.callbacks.session',
          authOptions?.callbacks?.session || {}
        );
      }
    } else {
      loggerBack.info('is not call authOptions.callbacks.jwt', authOptions?.callbacks?.jwt || {});
      loggerError(
        -1,
        'authOptions?.callbacks?.jwt',
        JSON.stringify(authOptions?.callbacks?.jwt || {})
      );
    }
    */

    // Info: (20241129 - tzuhan) Set the Session Cookie Manually
    const tokenExpiry = parseInt(process.env.APPLE_TOKEN_EXPIRY || '3600', 10);
    const sessionToken = await encode({
      token: { ...user },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: tokenExpiry,
    });

    res.setHeader(
      'Set-Cookie',
      `next-auth.session-token=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenExpiry}`
    );
    loggerBack.info('Set the Session Cookie Manually');

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
