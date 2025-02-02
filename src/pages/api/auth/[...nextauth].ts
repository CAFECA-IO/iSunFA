import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
// import AppleProvider from 'next-auth/providers/apple';
// import { generateAppleClientSecret } from '@/lib/utils/apple_auth';
import { ISUNFA_ROUTE } from '@/constants/url';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
/* Info: (20241128 - tzuhan) move to @/lib/utils/signIn
import { createUserByAuth, getUserByCredential } from '@/lib/utils/repo/authentication.repo';
import { generateIcon } from '@/lib/utils/generate_user_icon';
import { createFile } from '@/lib/utils/repo/file.repo';
import { FileFolder, PUBLIC_IMAGE_ID } from '@/constants/file';
*/
import { loggerError } from '@/lib/utils/logger_back';
import { handleSignInSession } from '@/lib/utils/signIn';
import { handleSignOutSession } from '@/lib/utils/signout';
import { DefaultValue } from '@/constants/default_value';
// Info: (20240829 - Anna) 邀請碼後續會使用，目前先註解
// import { getInvitationByCode } from '@/lib/utils/repo/invitation.repo';
// import { isInvitationValid, useInvitation } from '@/lib/utils/invitation';

/**
* Info: (20240813-Tzuhan) [Beta]
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

/** Info: (20240903 - Shirley)
 * 後端登入流程：
 * 1. 當用戶在前端點擊登入按鈕並選擇登入方式後，NextAuth 會處理 `/api/auth/signIn` 路由的請求。
 * 2. NextAuth 根據選擇的登入方式（如 Google 或 Apple），將用戶重新導向到相應的 OAuth 提供者進行認證。
 * 3. 用戶在 OAuth 提供者的頁面上完成認證後，提供者會將用戶重新導向回應用的 `/api/auth/callback/:provider` 路由。
 * 4. NextAuth 處理這個回調路由，並觸發 `signIn` 回調函數：
 *    a. 通過 `getUserByCredential` 函數檢查用戶是否已存在於資料庫中。
 *    b. 如果用戶不存在：
 *       - 使用 `createUserByAuth` 函數在資料庫中建立新用戶。
 *       - 如果用戶有頭像，使用 `fetchImageInfo` 獲取頭像資訊，否則使用 `generateIcon` 生成預設頭像。
 *       - 使用 `createFileAndConnectUser` 函數將用戶頭像保存為文件並與用戶關聯。
 *    c. 無論是新用戶還是已存在的用戶，都使用 `setSession` 函數將用戶的 ID 儲存在 session 中。
 * 5. 登入成功後，NextAuth 將用戶重新導向回應用的主頁面(iSunFA login page)。
 *
 * 後續的 API 請求處理：
 * 6. 當前端調用 `getStatusInfo` API 時，後端的 `status_info.ts` 處理這個請求：
 *    a. 使用 `getSession` 函數獲取當前請求的 session，從中提取用戶 ID 和公司 ID。
 *    b. 使用 `getUserById` 函數從資料庫獲取用戶詳細資訊。
 *    c. 如果 session 中有公司 ID，則使用 `getCompanyById` 函數獲取公司詳細資訊。
 *    d. 將獲取到的用戶和公司資訊格式化後回傳給前端。
 *
 * 用戶同意條款的處理：
 * 7. 當用戶同意條款時，前端會調用相應的 API，後端處理這個請求：
 *    a. 驗證用戶的 session。
 *    b. 更新資料庫中用戶的同意狀態。
 *    c. 回傳更新結果給前端。
 *
 * 選擇公司的處理：
 * 8. 當用戶選擇公司時，前端會調用相應的 API，後端處理這個請求：
 *    a. 驗證用戶的 session。
 *    b. 更新資料庫中用戶的公司關聯。
 *    c. 使用 `setSession` 函數更新 session 中的公司 ID。
 *    d. 回傳更新結果給前端。
 *
 * 總結：
 * - 後端使用 NextAuth 處理 OAuth2.0 的認證流程。
 * - `session.ts` 中的 `getSession` 和 `setSession` 函數被用於管理用戶的 session，這些函數可以被 NextAuth 和其他 API 路由使用。
 * - 用戶數據的建立、讀取和更新操作都通過資料庫操作函數（如 `getUserByCredential`, `createUserByAuth` 等）來完成。
 * - API 路由（如 `status_info.ts`）使用 `getSession` 函數來獲取當前用戶的 session 資訊，確保只有已登入的用戶可以訪問受保護的資源。
 * - 用戶同意條款不會更新 session，而是更新資料庫中的用戶同意狀態。
 * - 選擇公司的操作更新資料庫和 session，確保用戶狀態的一致性。
 */

/* Info: (20241128 - tzuhan) @Murky move to @/lib/utils/signIn
async function fetchImageInfo(imageUrl: string): Promise<{
  iconUrl: string;
  mimeType: string;
  size: number;
}> {
  let mimeType = 'image/jpeg'; // Info: (20240902 - Murky) Default image type is jpeg
  let size = 0;

  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      mimeType = blob.type;
      size = blob.size;
    }
  } catch {
    // Info: (20240902 - Murky) Do nothing
  }

  return {
    iconUrl: imageUrl,
    mimeType,
    size,
  };
}
*/

export const getAuthOptions = (req: NextApiRequest): NextAuthOptions => ({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  /** Info: (20241127 - tzuhan) Apple login 單獨實作
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: generateAppleClientSecret(),
      authorization: {
        params: {
          response_type: 'code', // Info: (20241127-tzuhan) 指定授權類型
          scope: 'openid email', // Info: (20241127-tzuhan) 必須包含 openid 和 email
          response_mode: 'form_post', // Info: (20241127-tzuhan) 使用 form_post 方式回傳
        },
      },
      checks: ['pkce'],
    }),
  ],
  cookies: {
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 900,
      },
    },
  },
  */
  session: {
    strategy: 'jwt', // Info: (20241129-tzuhan) 僅使用 JWT
  },
  pages: {
    signIn: ISUNFA_ROUTE.LOGIN,
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    signOut: async () => {
      await handleSignOutSession(req);
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      const session = await getSession(req);
      try {
        if (!account) throw Error('Account not found');
        await handleSignInSession(req, user, account);
        /* /* Info: (20241128 - tzuhan) @Anna, @Murky move to @/lib/utils/signIn
        // Info: (20240829 - Anna) 邀請碼後續會使用，目前先註解
        // let Dbuser;
        // const { invitation } = (account?.params || {}) as { invitation: string };
        const getUser = await getUserByCredential(account?.providerAccountId || user.id);
        if (!getUser) {
          // Info: (20240813 - Tzuhan) check if the user is in the database and update the token and if the user is not in the database, create a new user in the database.
          if (account && user) {
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
            const imageName = user.name + '_icon';
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

            // Info: (20240829 - Anna) 與邀請碼相關，目前先註解
            // Dbuser = createdUser;
          }
        } else {
          // Info: (20240829 - Anna) 與邀請碼相關，目前先註解
          // Dbuser = getUser;
          // ToDo: (20241121 - Jacky) Delete User from DB if deletedAt + 7 days is less than current date
          await setSession(session, { userId: getUser.user.id });
        }
        await createUserActionLog({
          sessionId: session.isunfa,
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
        /* Info: (20240829 - Anna) 邀請碼後續會使用，目前先註解
        if (invitationCode) {
          const getInvitation = await getInvitationByCode(invitationCode);
          if (getInvitation) {
            const isValid = await isInvitationValid(getInvitation);
            if (isValid) {
              await useInvitation(getInvitation, Dbuser?.id ?? 0);
              // ToDo: (20240829 - Jacky) Add error handling with logger
              // statusMessage = admin
              //   ? STATUS_MESSAGE.CREATED_INVITATION
              //   : STATUS_MESSAGE.INVITATION_CONFLICT;
            }
          }
        }
        */
      } catch (_error) {
        // ToDo: (20240829 - Jacky) Add error handling with logger
        const error = _error as Error;
        const errorInfo = {
          userId: session.userId || DefaultValue.USER_ID.GUEST,
          errorType: 'signIn failed',
          errorMessage: error.message,
        };
        loggerError(errorInfo);
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  debug: false,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authOptions = getAuthOptions(req);

  // Info: (20250114 - Luphia) 將 session id 寫入 cookie 內的 isunfa 參數
  const session = await getSession(req);
  res.setHeader('isunfa', session.isunfa);

  NextAuth(req, res, authOptions);
}
