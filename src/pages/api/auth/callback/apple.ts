import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { generateAppleClientSecret } from '@/lib/utils/apple_auth';
import { getSession, setSession } from '@/lib/utils/session';
import { ISUNFA_ROUTE } from '@/constants/url';
import { createUserByAuth, getUserByCredential } from '@/lib/utils/repo/authentication.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder, PUBLIC_IMAGE_ID } from '@/constants/file';
import { APIPath } from '@/constants/api_connection';
import { UserActionLogActionType } from '@/constants/user_action_log';
import { createUserActionLog } from '@/lib/utils/repo/user_action_log.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

async function fetchImageInfo(imageUrl: string): Promise<{
  iconUrl: string;
  mimeType: string;
  size: number;
}> {
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      return {
        iconUrl: imageUrl,
        mimeType: blob.type,
        size: blob.size,
      };
    }
  } catch {
    // Info: (20241127 - tzuhan) 如果請求失敗，返回默認值
  }
  return {
    iconUrl: imageUrl,
    mimeType: 'image/jpeg',
    size: 0,
  };
}

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

    const session = await getSession(req, res);

    // Info: (20241127 - tzuhan) 檢查用戶是否已存在於數據庫
    const existingUser = await getUserByCredential(account.providerAccountId || user.id);

    if (!existingUser) {
      // Info: (20241127 - tzuhan) 如果用戶不存在，創建用戶
      let userImage = {
        iconUrl: user.image ?? '',
        mimeType: 'image/jpeg',
        size: 0,
      };

      if (user.image) {
        userImage = await fetchImageInfo(user.image);
      } else {
        userImage = await generateIcon(user.name ?? '');
      }

      const imageName = `${user.name || 'user'}_icon`;
      const file = await createFile({
        name: imageName,
        size: userImage.size,
        mimeType: userImage.mimeType,
        type: FileFolder.TMP,
        url: userImage.iconUrl,
        isEncrypted: false,
        encryptedSymmetricKey: '',
      });

      const createdUser = await createUserByAuth({
        name: user.name || '',
        email: user.email || '',
        provider: account.provider,
        credentialId: account.providerAccountId,
        method: account.type,
        authData: account,
        imageId: file?.id ?? PUBLIC_IMAGE_ID,
      });

      await setSession(session, { userId: createdUser.user.id });
    } else {
      // Info: (20241127 - tzuhan) 用戶已存在，設置 session
      await setSession(session, { userId: existingUser.user.id });
    }

    // Info: (20241127 - tzuhan) 記錄用戶行為
    await createUserActionLog({
      sessionId: session.id,
      userId: session.userId || -1,
      actionType: UserActionLogActionType.LOGIN,
      actionDescription: UserActionLogActionType.LOGIN,
      ipAddress: req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'] as string,
      apiEndpoint: req.url || APIPath.SIGN_IN,
      httpMethod: req.method || '',
      requestPayload: req.body,
      statusMessage: STATUS_MESSAGE.SUCCESS,
    });

    // Info: (20241127 - tzuhan) 登錄成功，重定向到 LOGIN，帶 signin=true
    res.redirect(`${ISUNFA_ROUTE.LOGIN}`);
  } catch (err) {
    // Info: (20241127 - tzuhan) 錯誤處理
    const errorInfo = {
      userId: DefaultValue.USER_ID.GUEST,
      errorType: 'Apple sign-in failed',
      errorMessage: err instanceof Error ? err.message : 'Unknown error',
    };
    loggerError(errorInfo);
    res.redirect(
      `${ISUNFA_ROUTE.LOGIN}?signin=false&error=${encodeURIComponent(errorInfo.errorMessage)}`
    );
  }
}
