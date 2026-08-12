import { AuthProvider } from "@/constants/auth_provider";

/**
 * Info: (20260809 - Luphia) 第三方登入回傳的標準化使用者輪廓。
 * 各 provider 的原始欄位（Google 的 sub / picture、Apple 的 sub 等）
 * 一律在各自的 provider 實作內收斂成這個介面，Service 層不碰 provider 私有格式。
 */
export interface IOAuthProfile {
  provider: AuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface IOAuthAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
}

export interface IOAuthProviderConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Info: (20260809 - Luphia) 新增登入方式時只要實作這個介面並註冊到 registry，
 * Service / API / 前端都不需要改動。
 */
export interface IOAuthProvider {
  readonly provider: AuthProvider;
  readonly scopes: readonly string[];

  /**
   * Info: (20260809 - Luphia) 設定的正式來源是資料庫（經 SUPER_ADMIN 簽章），
   * env 僅為 fallback，因此設定解析是非同步的。
   */
  isConfigured(): Promise<boolean>;

  /**
   * Info: (20260809 - Luphia) 組出授權網址，同時產生 state 與 PKCE code_verifier；
   * 兩者由呼叫端封裝成簽章後的 state token 交給前端保管。
   */
  buildAuthorizationRequest(
    redirectUri: string,
  ): Promise<IOAuthAuthorizationRequest>;

  /**
   * Info: (20260809 - Luphia) 以授權碼換取 provider 身分，
   * 內含 id_token 簽章驗證（不可只信任 userinfo endpoint 的 HTTP 回應）。
   */
  fetchProfile(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<IOAuthProfile>;
}

// Info: (20260809 - Luphia) 簽章後的 state token 內容，用來在無狀態的情況下綁定一次授權流程
export interface IOAuthStatePayload {
  provider: AuthProvider;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo?: string;
}

export interface IOAuthLoginResult {
  dewt: string;
  user: {
    address: string;
    name: string | null;
    role: string;
  };
  // Info: (20260809 - Luphia) 首次以第三方身分註冊時為 true，前端可據此顯示導覽
  isNewUser: boolean;
  returnTo?: string;
}
