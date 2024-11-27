import jwt from 'jsonwebtoken';

export const generateAppleClientSecret = (): string => {
  const { APPLE_PRIVATE_KEY, APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_TOKEN_EXPIRY } =
    process.env;

  if (!APPLE_PRIVATE_KEY || !APPLE_TEAM_ID || !APPLE_CLIENT_ID || !APPLE_KEY_ID) {
    throw new Error('Missing required environment variables for Apple client secret generation');
  }

  const tokenExpiry = parseInt(APPLE_TOKEN_EXPIRY || '3600', 10);

  // Info: (20241125 - tzuhan) 獲取 Apple 私鑰，確保正確處理換行符號
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) {
    throw new Error('APPLE_PRIVATE_KEY is not defined or incorrectly formatted');
  }
  try {
    // Info: (20241125 - tzuhan) 生成 JWT
    const clientSecret = jwt.sign(
      {
        iss: process.env.APPLE_TEAM_ID, // Info: (20241125 - tzuhan) 團隊 ID（在 Apple 開發者平台獲取）
        iat: Math.floor(Date.now() / 1000), // Info: (20241125 - tzuhan) 發行時間（秒級時間戳）
        exp: Math.floor(Date.now() / 1000) + tokenExpiry, // Info: (20241125 - tzuhan) 過期時間，這裡用1小時（最大 180 天）
        aud: 'https://appleid.apple.com', // Info: (20241125 - tzuhan) 固定值
        sub: process.env.APPLE_CLIENT_ID, // Info: (20241125 - tzuhan) App 的 Client ID（服務 ID）
      },
      privateKey, // Info: (20241125 - tzuhan) 使用 Apple 提供的私鑰
      {
        algorithm: 'ES256', // Info: (20241125 - tzuhan) 使用 ES256 演算法
        header: {
          alg: 'ES256',
          kid: process.env.APPLE_KEY_ID, // Info: (20241125 - tzuhan) 私鑰的 Key ID（在 Apple 開發者平台獲取）
        },
      }
    );

    return clientSecret;
  } catch (error) {
    throw new Error(`Failed to generate Apple client secret: ${(error as Error).message}`);
  }
};
