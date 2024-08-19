import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import jwt from 'jsonwebtoken';
import { ISUNFA_ROUTE } from '@/constants/url';
import { getSession, setSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { createUserByAuth, getUserByCredential } from '@/lib/utils/repo/authentication.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';

/**
* Info: [Beta](20240813-Tzuhan)
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return NextAuth(req, res, {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      }),
      // Info: (20240813-Tzuhan) Apple login is not provided in the beta version
      // AppleProvider({
      //   clientId: process.env.APPLE_CLIENT_ID as string,
      //   clientSecret: generateAppleClientSecret(),
      // }),
    ],
    pages: {
      signIn: ISUNFA_ROUTE.LOGIN_BETA,
    },
    // session: {
    //   strategy: 'jwt',
    // },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      async signIn({ user, account, profile }) {
        // Deprecate: [Beta](20240819-Tzuhan)dev
        // eslint-disable-next-line no-console
        console.log('signIn callback', user, account, profile);
        const { invitation } = (account?.params || {}) as { invitation: string };

        // Deprecate: [Beta](20240819-Tzuhan)dev
        // eslint-disable-next-line no-console
        console.log('Custom Params:', invitation);

        const session = await getSession(req, res);
        // TODO: [Beta](20240813-Tzuhan) To Jacky, here is the place to check if the user is in the database and update the token and if the user is not in the database, create a new user in the database.
        /**
         * Info: [Beta](20240813-Tzuhan)
         * recommended user model:
           model User {
             id           Int          @id @default(autoincrement())
             name         String
             fullName     String?      @map("full_name")
             email        String?      @unique
             phone        String?
             credentialId String?      @unique @map("credential_id")
             publicKey    String?      @map("public_key")
             algorithm    String?
             imageId      String?      @map("image_id")
             [新增] googleId     String?      @unique @map("google_id")      // Google login ID
             [新增] appleId      String?      @unique @map("apple_id")       // Apple login ID
             [新增] hasReadAgreement Boolean @default(false) // 用户是否同意了條款
             createdAt    Int          @map("created_at")
             updatedAt    Int          @map("updated_at")
             deletedAt    Int?         @map("deleted_at")
             admins       Admin[]
             invitations  Invitation[]

             @@map("user")
           }
         */
        const getUser = await getUserByCredential(account?.providerAccountId || user.id);

        if (!getUser) {
          if (account && user) {
            const imageUrl = user.image ?? (await generateIcon(user.name ?? ''));
            const createdUser = await createUserByAuth({
              name: user.name || '',
              email: user.email || '',
              provider: account.provider,
              credentialId: account.providerAccountId,
              method: account.type,
              authData: account,
              imageUrl,
            });

            await setSession(session, createdUser.user.id);
          }
        } else {
          await setSession(session, getUser.user.id);
        }
        return true;
      },
      async redirect({ url, baseUrl }) {
        return url.startsWith(baseUrl) ? url : baseUrl;
      },
    },
    debug: true,
  });
}
