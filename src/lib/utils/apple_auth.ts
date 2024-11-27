/* eslint-disable no-console */
import jwt from 'jsonwebtoken';
// const axios = require('axios');
// const jwt = require('jsonwebtoken');
// require('dotenv').config();

export const generateAppleClientSecret = (): string => {
  const { APPLE_PRIVATE_KEY, APPLE_TEAM_ID, APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_TOKEN_EXPIRY } =
    process.env;

  if (!APPLE_PRIVATE_KEY || !APPLE_TEAM_ID || !APPLE_CLIENT_ID || !APPLE_KEY_ID) {
    throw new Error('Missing required environment variables for Apple client secret generation');
  }

  const tokenExpiry = parseInt(APPLE_TOKEN_EXPIRY || '3600', 10);

  // Info: (20241125 - tzuhan) 獲取 Apple 私鑰，確保正確處理換行符號
  const privateKey = APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) {
    throw new Error('APPLE_PRIVATE_KEY is not defined or incorrectly formatted');
  }
  try {
    // Info: (20241125 - tzuhan) 生成 JWT
    const clientSecret = jwt.sign(
      {
        iss: APPLE_TEAM_ID, // Info: (20241125 - tzuhan) 團隊 ID（在 Apple 開發者平台獲取）
        iat: Math.floor(Date.now() / 1000), // Info: (20241125 - tzuhan) 發行時間（秒級時間戳）
        exp: Math.floor(Date.now() / 1000) + tokenExpiry, // Info: (20241125 - tzuhan) 過期時間，這裡用1小時（最大 180 天）
        aud: 'https://appleid.apple.com', // Info: (20241125 - tzuhan) 固定值
        sub: APPLE_CLIENT_ID, // Info: (20241125 - tzuhan) App 的 Client ID（服務 ID）
      },
      privateKey, // Info: (20241125 - tzuhan) 使用 Apple 提供的私鑰
      {
        algorithm: 'ES256', // Info: (20241125 - tzuhan) 使用 ES256 演算法
        header: {
          alg: 'ES256',
          kid: APPLE_KEY_ID, // Info: (20241125 - tzuhan) 私鑰的 Key ID（在 Apple 開發者平台獲取）
        },
      }
    );

    return clientSecret;
  } catch (error) {
    throw new Error(`Failed to generate Apple client secret: ${(error as Error).message}`);
  }
};

/** Info: test code
const requestAppleToken = async () => {
  const clientSecret = generateAppleClientSecret();
  console.log('Generated clientSecret:', clientSecret);

  const body = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID!,
    client_secret: clientSecret,
    code: 'AUTHORIZATION_CODE',
    grant_type: 'authorization_code',
    redirect_uri: 'https://isunfa.tw/api/auth/callback/apple',
  });

  try {
    const response = await axios.post('https://appleid.apple.com/auth/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('Token response:', response.data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.response) {
      console.error('Error fetching token:', error.response.data);
    } else {
      console.error('Error fetching token:', error.message);
    }
  }
};

// 執行測試
requestAppleToken();
*/
