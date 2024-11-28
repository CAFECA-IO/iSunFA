import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { generateAppleClientSecret } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';

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
    // Info: (20241127 - tzuhan) 生成 Apple Client Secret
    const clientSecret = generateAppleClientSecret();

    // Info: (20241127 - tzuhan) 使用 fetch 發送請求到 Apple 的 /auth/token 端點
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID!,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.APPLE_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    const { id_token: idToken } = tokenData;

    // Info: (20241127 - tzuhan) 解碼 id_token 提取用戶數據
    const decoded = jwt.decode(idToken) as {
      email?: string;
      sub: string;
      name?: string;
      image?: string;
    };
    const account = {
      provider: 'apple',
      providerAccountId: decoded?.sub,
      type: 'oauth',
    };
    const user = {
      id: decoded?.sub,
      email: decoded?.email,
      name: decoded?.name,
      image: decoded?.image,
    };

    await handleSignInSession(req, res, user, account);

    // Info: (20241127 - tzuhan) 登錄成功，重定向到 LOGIN，帶 signin=true
    res.redirect(`${ISUNFA_ROUTE.LOGIN}`);
  } catch (err) {
    // Info: (20241127 - tzuhan) 錯誤處理
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    loggerError(-1, 'Apple sign-in failed', err as Error);
    res.redirect(`${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent(errorMessage)}`);
  }
}
