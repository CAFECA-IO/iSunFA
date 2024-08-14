import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import jwt from 'jsonwebtoken';
import { ISUNFA_ROUTE } from '@/constants/url';

/**
* Info: (20240813 - Tzuhan)
* 1. 檔案名稱與路徑
  * 檔案名稱為 [...nextauth].ts，路徑為 pages/api/auth/[...nextauth].ts。這是 Next.js 中一種特殊的檔案命名方式，用於動態路由。[...] 表示捕獲所有路由段，nextauth 是自定義名稱，表示該檔案處理 next-auth 的所有請求。
* 2. 檔案的作用
  * 此檔案是 Next.js 應用中 next-auth 的配置檔案，負責處理所有與 next-auth 相關的 API 請求，包含登入、註冊、回調、登出等功能。
  * 路由捕獲：檔案名稱中的 [...nextauth] 表示該檔案會捕獲所有以 /api/auth/ 開頭的路由請求。例如：
    /api/auth/signin
    /api/auth/signout
    /api/auth/callback/google
    /api/auth/session
  * next-auth 集成：此檔案配置了不同的 OAuth 提供者（如 Google 和 Apple），並處理與用戶認證、會話管理等相關的所有操作
*/

// const generateAppleClientSecret = () => {
//   const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
//   if (!privateKey) {
//     throw new Error('APPLE_PRIVATE_KEY is not defined or incorrectly formatted');
//   }

//   return jwt.sign(
//     {
//       iss: process.env.APPLE_TEAM_ID as string,
//       iat: Math.floor(Date.now() / 1000),
//       exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180,
//       aud: 'https://appleid.apple.com',
//       sub: process.env.APPLE_CLIENT_ID as string,
//     },
//     privateKey,
//     {
//       algorithm: 'ES256',
//       header: {
//         alg: 'ES256',
//         kid: process.env.APPLE_KEY_ID as string,
//       },
//     }
//   );
// };

// Deprecated: (20240815 - Tzuhan) Remove dummy function
const findOrCreateUser = async ({
  provider,
  providerAccountId,
  name,
  email,
}: {
  provider: string;
  providerAccountId: string;
  name: string;
  email: string;
}) => {
  // eslint-disable-next-line no-console
  console.log('findOrCreateUser', provider, providerAccountId, name, email);
  return {
    id: '1',
    hasReadAgreement: false,
    provider,
    providerAccountId,
    name,
    email,
  };
};

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // AppleProvider({
    //   clientId: process.env.APPLE_CLIENT_ID as string,
    //   clientSecret: generateAppleClientSecret(),
    // }),
  ],
  pages: {
    signIn: ISUNFA_ROUTE.LOGIN_BETA,
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, user }) {
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('jwt callback', token, account, user);
      // TODO: (20240813 - Tzuhan) To Jacky, here is the place to check if the user is in the database and update the token and if the user is not in the database, create a new user in the database.
      /**
       * Info: (20240813 - Tzuhan)
       * recommended user model:
         model User {
           id               Int      @id @default(autoincrement())  // 用戶的唯一標示符
           name             String   // 用户名
           fullName         String?  // 全名
           email            String?  // email
           phone            String?  // 電話
           imageId          String?  // 頭像ID
           provider         String?  // OAuth 提供者（如 'google' 或 'apple'）
           providerAccountId String?  @unique // OAuth 提供者帳號ID
           hasReadAgreement Boolean  @default(false) // 用户是否同意了條款
           createdAt        DateTime @default(now()) // 創建時間
           updatedAt        DateTime @updatedAt // 更新時間
           deletedAt        DateTime? // 删除時間（邏輯删除）
         }
       */
      let newToken = token;
      if (account && user) {
        // 查找或創建新用户（不更新已有用户）
        const dbUser = await findOrCreateUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          name: user.name ? user.name : '',
          email: user.email ? user.email : '',
        });
        newToken = {
          ...token,
          accessToken: account.access_token,
          provider: account.provider,
          userId: dbUser.id,
          hasReadAgreement: dbUser.hasReadAgreement,
        };
      }
      // eslint-disable-next-line no-console
      console.log('jwt newToken', newToken);
      return newToken;
    },
    async session({ session, token }) {
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('session callback', session, token);
      const newSession = {
        ...session,
        user: {
          ...session.user,
          id: token.userId as string,
          hasReadAgreement: token.hasReadAgreement as boolean,
          provider: token.provider as string,
          accessToken: token.accessToken as string,
        },
      };
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('newSession', newSession);
      return newSession;
    },
    async redirect({ url, baseUrl }) {
      // Deprecated: (20240815 - Tzuhan) Remove console.log
      // eslint-disable-next-line no-console
      console.log('redirect callback', url, baseUrl);

      if (url === `${baseUrl}${ISUNFA_ROUTE.LOGIN_BETA}`) {
        return url;
      } else {
        return url.startsWith(baseUrl) ? url : baseUrl;
      }
    },
  },
  debug: true,
});
