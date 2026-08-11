import { createHash, randomBytes } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthProvider } from "@/constants/auth_provider";
import { SystemSettingKey } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logger } from "@/lib/utils/logger";
import {
  IOAuthAuthorizationRequest,
  IOAuthProfile,
  IOAuthProvider,
} from "@/interfaces/oauth";

// Info: (20260809 - Luphia) Google OpenID Connect 端點（取自 discovery document，長年穩定故直接內嵌）
const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Info: (20260809 - Luphia) 模組層快取 JWKS，避免每次登入都對 Google 拉一次金鑰
const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

interface IGoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

/**
 * Info: (20260809 - Luphia) id_token 內我們會用到的 claim。
 * 一律走 unknown + 型別守衛收斂，不直接把 JWTPayload 當成已知結構使用。
 */
interface IGoogleIdTokenClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function toIdTokenClaims(payload: unknown): IGoogleIdTokenClaims {
  if (typeof payload !== "object" || payload === null) {
    throw new AppError(API_ERRORS.AUTH_OAUTH_EXCHANGE_FAILED);
  }

  const claims = payload as Record<string, unknown>;
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new AppError(API_ERRORS.AUTH_OAUTH_EXCHANGE_FAILED);
  }

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    email_verified: claims.email_verified === true,
    name: typeof claims.name === "string" ? claims.name : undefined,
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}

export class GoogleOAuthProvider implements IOAuthProvider {
  public readonly provider = AuthProvider.GOOGLE;
  public readonly scopes = ["openid", "email", "profile"] as const;

  /**
   * Info: (20260809 - Luphia) 設定來自 DB（system_setting，經 SUPER_ADMIN 簽章），
   * DB 未設定時退回 env。因此改 Google 用戶端不需要動 .env、不需要重啟服務。
   */
  private async resolveConfig(): Promise<{
    clientId?: string;
    clientSecret?: string;
  }> {
    const settings = await systemSettingService.getMany([
      SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID,
      SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET,
    ]);

    return {
      clientId: settings[SystemSettingKey.GOOGLE_OAUTH_CLIENT_ID],
      clientSecret: settings[SystemSettingKey.GOOGLE_OAUTH_CLIENT_SECRET],
    };
  }

  public async isConfigured(): Promise<boolean> {
    const { clientId, clientSecret } = await this.resolveConfig();
    return Boolean(clientId && clientSecret);
  }

  private async requireConfig(): Promise<{
    clientId: string;
    clientSecret: string;
  }> {
    const { clientId, clientSecret } = await this.resolveConfig();
    if (!clientId || !clientSecret) {
      throw new AppError(API_ERRORS.AUTH_PROVIDER_NOT_CONFIGURED);
    }
    return { clientId, clientSecret };
  }

  public async buildAuthorizationRequest(
    redirectUri: string,
  ): Promise<IOAuthAuthorizationRequest> {
    const { clientId } = await this.requireConfig();

    const state = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: this.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      // Info: (20260809 - Luphia) 只要身分不要離線存取，故不索取 refresh_token
      access_type: "online",
      prompt: "select_account",
    });

    return {
      authorizationUrl: `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params.toString()}`,
      state,
      codeVerifier,
    };
  }

  public async fetchProfile(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<IOAuthProfile> {
    const { clientId, clientSecret } = await this.requireConfig();

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      code_verifier: params.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri,
    });

    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenResponse = (await response.json()) as IGoogleTokenResponse;

    if (!response.ok || !tokenResponse.id_token) {
      logger.error("Google token exchange failed:", {
        status: response.status,
        error: tokenResponse.error ?? "",
        description: tokenResponse.error_description ?? "",
      });
      throw new AppError(API_ERRORS.AUTH_OAUTH_EXCHANGE_FAILED);
    }

    /**
     * Info: (20260809 - Luphia) 用 Google 的 JWKS 驗證 id_token 簽章、issuer 與 audience。
     * 這一步是信任邊界：只有通過簽章驗證的 sub 才能拿來查詢或建立帳號。
     */
    let claims: IGoogleIdTokenClaims;
    try {
      const { payload } = await jwtVerify(tokenResponse.id_token, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: clientId,
      });
      claims = toIdTokenClaims(payload);
    } catch (error) {
      logger.error("Google id_token verification failed:", {
        message: (error as Error).message,
      });
      throw new AppError(API_ERRORS.AUTH_OAUTH_EXCHANGE_FAILED);
    }

    return {
      provider: this.provider,
      providerUserId: claims.sub,
      email: claims.email ?? null,
      emailVerified: claims.email_verified === true,
      displayName: claims.name ?? null,
      avatarUrl: claims.picture ?? null,
    };
  }
}

export const googleOAuthProvider = new GoogleOAuthProvider();
