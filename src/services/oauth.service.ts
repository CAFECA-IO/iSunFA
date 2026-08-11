import { AuthProvider } from "@/constants/auth_provider";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import { isSameEffectiveOrigin } from "@/lib/utils/host";
import { signDeWT } from "@/lib/auth/dewt";
import {
  getOAuthProvider,
  listEnabledProviders,
} from "@/lib/auth/oauth/registry";
import { signStateToken, verifyStateToken } from "@/lib/auth/oauth/state_token";
import { IOAuthCallbackInput, IOAuthStartInput } from "@/validators/oauth";
import { IOAuthLoginResult, IOAuthProfile } from "@/interfaces/oauth";
import { IUser } from "@/interfaces/user";
import {
  IUserIdentityRepository,
  userIdentityRepo,
} from "@/repositories/user_identity.repo";
import { userRepo, UserRepository } from "@/repositories/user.repo";
import {
  webAuthnRepo,
  IWebAuthnRepository,
} from "@/repositories/webauthn.repo";
import { custodialKeyRepo } from "@/repositories/custodial_key.repo";
import {
  custodialWalletService,
  CustodialWalletService,
} from "@/services/custodial_wallet.service";
import { createTeamForUsersWithoutTeam } from "@/services/team.service";
import { createAccountBookForTeamsWithoutOne } from "@/services/account_book.service";

const DEFAULT_AVATAR_URL = "default_avatar_url";

export interface IOAuthStartResult {
  authorizationUrl: string;
  stateToken: string;
}

/**
 * Info: (20260809 - Luphia) 第三方登入的業務大腦。
 *
 * 流程分兩段（授權碼流程，前端不接觸 client_secret）：
 * 1. start    ：組授權網址 + 簽發短效 state token，前端存於 sessionStorage 後導向 provider
 * 2. callback ：以 code 換取經簽章驗證的 provider 身分，查表或建帳，最後簽發 DeWT
 *
 * 帳號對應規則（刻意保守）：
 * - 只以 (provider, providerUserId) 查表，絕不用 email 自動合併既有帳號。
 *   既有的 passkey 使用者在 User 上沒有 email 可比對，靠 email 猜測合併等於開後門。
 * - 既有使用者要多一種登入方式，必須在「已登入狀態」下呼叫 linkIdentity 明確綁定。
 */
export class OAuthService {
  constructor(
    private readonly identityRepo: IUserIdentityRepository,
    private readonly users: UserRepository,
    private readonly webAuthn: IWebAuthnRepository,
    private readonly custodialWallet: CustodialWalletService,
  ) {}

  public async listProviders(): Promise<AuthProvider[]> {
    return listEnabledProviders();
  }

  /**
   * Info: (20260810 - Luphia) 唯一可以完成 OAuth 流程的 origin。
   * 回傳 null 代表設定缺漏，前端此時不做 origin 檢查（避免誤擋）。
   */
  public getCanonicalOrigin(): string | null {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return null;

    try {
      return new URL(appUrl).origin;
    } catch {
      return null;
    }
  }

  /**
   * Info: (20260809 - Luphia) 只接受本站自己的 callback 網址，阻擋 open redirect：
   * 攻擊者若能指定任意 redirectUri，就能把授權碼導到自己的網域。
   *
   * Info: (20260810 - Luphia) 比對走 isSameEffectiveOrigin 而非字面 origin：
   * protocol 與 port 仍嚴格比對（不同信任邊界），只有 localhost / 127.0.0.1 這類
   * 迴環位址視為同一台主機——它們本來就是，字面比對會讓本機開發無法登入。
   */
  private assertRedirectUriAllowed(redirectUri: string): void {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new AppError(API_ERRORS.IS_CONFIG_MISSING);
    }

    try {
      const target = new URL(redirectUri);
      const allowed = new URL(appUrl);
      if (!isSameEffectiveOrigin(target, allowed)) {
        throw new AppError(API_ERRORS.AUTH_REDIRECT_URI_NOT_ALLOWED);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(API_ERRORS.AUTH_REDIRECT_URI_NOT_ALLOWED);
    }
  }

  public async startAuthorization(
    provider: AuthProvider,
    input: IOAuthStartInput,
  ): Promise<IOAuthStartResult> {
    this.assertRedirectUriAllowed(input.redirectUri);

    const impl = await getOAuthProvider(provider);
    const request = await impl.buildAuthorizationRequest(input.redirectUri);

    const stateToken = await signStateToken({
      provider,
      state: request.state,
      codeVerifier: request.codeVerifier,
      redirectUri: input.redirectUri,
      returnTo: input.returnTo,
    });

    return { authorizationUrl: request.authorizationUrl, stateToken };
  }

  /**
   * Info: (20260809 - Luphia) 驗證 state token 並向 provider 換取身分。
   * state 不符即視為 CSRF / 重放，直接凍結。
   */
  private async resolveProfile(input: IOAuthCallbackInput): Promise<{
    profile: IOAuthProfile;
    returnTo?: string;
  }> {
    const statePayload = await verifyStateToken(input.stateToken);

    if (
      statePayload.state !== input.state ||
      statePayload.provider !== input.provider
    ) {
      throw new AppError(API_ERRORS.AUTH_OAUTH_STATE_INVALID);
    }

    const impl = await getOAuthProvider(statePayload.provider);
    const profile = await impl.fetchProfile({
      code: input.code,
      codeVerifier: statePayload.codeVerifier,
      redirectUri: statePayload.redirectUri,
    });

    return { profile, returnTo: statePayload.returnTo };
  }

  public async completeLogin(
    input: IOAuthCallbackInput,
  ): Promise<IOAuthLoginResult> {
    const { profile, returnTo } = await this.resolveProfile(input);

    const existing = await this.loginExistingIdentity(profile, returnTo);
    if (existing) return existing;

    try {
      const user = await this.registerWithProfile(profile);
      return this.toLoginResult(user, true, returnTo);
    } catch (error) {
      /**
       * Info: (20260809 - Luphia) 併發註冊競態：同一個第三方帳號在兩個分頁同時首次登入時，
       * 兩邊都會走到建帳路徑，後到的一方會撞上 (provider, providerUserId) 的唯一鍵。
       * 這種情況下對方已經建好帳號，直接改走登入而不是把錯誤丟給使用者。
       */
      if (!this.isUniqueConstraintError(error)) throw error;

      const retried = await this.loginExistingIdentity(profile, returnTo);
      if (retried) return retried;
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002"
    );
  }

  private async loginExistingIdentity(
    profile: IOAuthProfile,
    returnTo?: string,
  ): Promise<IOAuthLoginResult | null> {
    const identity = await this.identityRepo.findByProviderUserId(
      profile.provider,
      profile.providerUserId,
    );
    if (!identity) return null;

    const user = await this.webAuthn.findUserById(identity.userId);
    if (!user) {
      // Info: (20260809 - Luphia) 綁定存在但使用者已被刪除，屬資料不一致，不自動建新帳號
      logger.error("Orphan user identity detected", {
        identityId: identity.id,
        userId: identity.userId,
      });
      throw new AppError(API_ERRORS.AUTH_LOGIN_FAILED);
    }

    await this.identityRepo.touchLogin(identity.id, profile);
    return this.toLoginResult(user, false, returnTo);
  }

  /**
   * Info: (20260809 - Luphia) 首次以第三方身分註冊：先部署託管 SCW，成功後才寫 DB。
   * 順序刻意如此——鏈上部署失敗時不留下無錢包的殘缺帳號。
   *
   * Info: (20260811 - Luphia) 這個順序的代價，明講：
   *
   * 唯一鍵（provider, providerUserId）的競爭發生在部署之後。同一個 Google 帳號在兩個
   * 分頁同時首次登入，兩邊會各自部署一個 SCW（各花一次 gas），後到者撞 P2002 改走登入
   * 路徑，它那把私鑰隨 request 消失——鏈上就留下一個永久無人可控的合約。
   *
   * 也就是說我們把「無錢包的殘缺帳號」換成了「無帳號的殘缺錢包」。這個方向是對的
   * （壞掉的是一份沒人用的合約，而不是使用者的帳號），但它不是沒有代價。
   *
   * 要一併解掉的話：SCW 位址是 CREATE2 決定性的，不需要先部署就能算出來，
   * 因此可以先在 transaction 內以 (provider, providerUserId) 佔位、拿到佔位才部署。
   * 見 ADR 016 的後續工作。
   */
  private async registerWithProfile(profile: IOAuthProfile): Promise<IUser> {
    if (!profile.emailVerified) {
      throw new AppError(API_ERRORS.AUTH_OAUTH_EMAIL_UNVERIFIED);
    }

    const displayName =
      profile.displayName ?? profile.email?.split("@")[0] ?? "New User";

    const wallet = await this.custodialWallet.provisionWallet({
      displayName,
      imageUrl: profile.avatarUrl ?? DEFAULT_AVATAR_URL,
    });

    const created = await this.users.createSocialUser({
      address: wallet.address,
      name: displayName,
      imageUrl: profile.avatarUrl ?? DEFAULT_AVATAR_URL,
      credentialId: wallet.credentialId,
      pubKeyX: wallet.pubKeyX,
      pubKeyY: wallet.pubKeyY,
      profile,
      sealedPrivateKey: this.custodialWallet.sealPrivateKey(
        wallet.privateKeyPem,
      ),
    });

    // Info: (20260809 - Luphia) 與 passkey 登入一致：補齊團隊與帳簿
    await createTeamForUsersWithoutTeam();
    await createAccountBookForTeamsWithoutOne();

    const user = await this.webAuthn.findUserById(created.id);
    if (!user) {
      throw new AppError(API_ERRORS.AUTH_LOGIN_FAILED);
    }
    return user;
  }

  /**
   * Info: (20260809 - Luphia) 已登入（含 passkey）使用者主動綁定第三方帳號。
   * 這是既有使用者取得「Google 也能登入」的唯一途徑。
   */
  public async linkIdentity(
    userId: string,
    input: IOAuthCallbackInput,
  ): Promise<{ provider: AuthProvider; email: string | null }> {
    const { profile } = await this.resolveProfile(input);

    const existing = await this.identityRepo.findByProviderUserId(
      profile.provider,
      profile.providerUserId,
    );

    if (existing && existing.userId !== userId) {
      throw new AppError(API_ERRORS.AUTH_IDENTITY_ALREADY_LINKED);
    }

    if (existing) {
      await this.identityRepo.touchLogin(existing.id, profile);
    } else {
      await this.identityRepo.create(userId, profile);
    }

    return { provider: profile.provider, email: profile.email };
  }

  /**
   * Info: (20260809 - Luphia) 解除綁定。
   * 託管使用者（沒有 passkey）解除最後一個第三方身分等於自我鎖死帳號，故擋下。
   *
   * Info: (20260811 - Luphia) 已知限制，這裡如實記錄而不是假裝已解決：
   *
   * 「有沒有 passkey」目前是以「有沒有託管金鑰列」反推的。本專案的 User 只有單一
   * credentialId 欄位、沒有獨立的 authenticator 表，因此無法查出「這個社交註冊帳號
   * 後來補綁了 passkey」；而 schema 註解提到的「補綁後廢除託管金鑰列」也還沒有實作，
   * 全庫沒有任何刪除該列的程式碼。
   *
   * 結果是社交註冊使用者永遠被視為「沒有 passkey」，解綁功能對他們等於不存在。
   * 方向上是 fail closed（不會鎖死帳號），但要真正提供解綁，得先做「帳號安全設定」
   * 那個功能：補綁 passkey、確認可用、才刪掉託管金鑰列。見 ADR 016 的後續工作。
   */
  public async unlinkIdentity(
    userId: string,
    provider: AuthProvider,
  ): Promise<void> {
    const identities = await this.identityRepo.findByUserId(userId);
    if (!identities.some((identity) => identity.provider === provider)) {
      throw new AppError(API_ERRORS.AUTH_IDENTITY_NOT_LINKED);
    }

    const custodialKey = await custodialKeyRepo.findByUserId(userId);
    const hasPasskey = custodialKey === null;

    if (!hasPasskey && identities.length <= 1) {
      throw new AppError(API_ERRORS.AUTH_LAST_LOGIN_METHOD);
    }

    await this.identityRepo.deleteByUserAndProvider(userId, provider);
  }

  public async listIdentities(userId: string) {
    const identities = await this.identityRepo.findByUserId(userId);
    return identities.map((identity) => ({
      provider: identity.provider,
      email: identity.email,
      displayName: identity.displayName,
      linkedAt: identity.createdAt,
      lastLoginAt: identity.lastLoginAt,
    }));
  }

  private async toLoginResult(
    user: IUser,
    isNewUser: boolean,
    returnTo?: string,
  ): Promise<IOAuthLoginResult> {
    const dewt = await signDeWT(user);
    return {
      dewt,
      user: {
        address: user.address,
        name: user.name,
        role: user.role,
      },
      isNewUser,
      returnTo,
    };
  }
}

export const oauthService = new OAuthService(
  userIdentityRepo,
  userRepo,
  webAuthnRepo,
  custodialWalletService,
);
