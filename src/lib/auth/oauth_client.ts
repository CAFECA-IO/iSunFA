"use client";

import { ApiCode } from "@/lib/utils/status";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AuthProvider } from "@/constants/auth_provider";
import { INTERNAL_PATH_PATTERN, isSameEffectiveOrigin } from "@/lib/utils/host";

/**
 * Info: (20260809 - Luphia) 第三方登入的瀏覽器端流程。
 *
 * 授權碼交換一律由後端完成（client_secret 不下放前端），
 * 前端只負責保管 state token 與把 code 帶回來，因此 DeWT 不會經過網址列。
 */

const STATE_STORAGE_KEY = "oauth_state_token";
const INTENT_STORAGE_KEY = "oauth_intent";
const RETURN_TO_STORAGE_KEY = "oauth_return_to";

export type OAuthIntent = "login" | "link";

export interface IOAuthLoginPayload {
  dewt: string;
  user: {
    address: string;
    name: string | null;
    role: string;
  };
  isNewUser: boolean;
  returnTo?: string;
}

interface IApiEnvelope<T> {
  code: ApiCode | string;
  message?: string;
  errorCode?: string;
  payload: T | null;
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const data = (await response.json()) as IApiEnvelope<T>;

  if (data.code !== ApiCode.SUCCESS || data.payload === null) {
    throw new AppError({
      code: typeof data.errorCode === "string" ? data.errorCode : "IS000099",
      message: data.message || "OAuth request failed",
      status:
        typeof data.code === "string" &&
        (Object.values(ApiCode) as string[]).includes(data.code)
          ? (data.code as ApiCode)
          : ApiCode.INTERNAL_SERVER_ERROR,
    });
  }

  return data.payload;
}

export function buildRedirectUri(provider: AuthProvider): string {
  return `${window.location.origin}/auth/callback/${provider.toLowerCase()}`;
}

export interface IProviderAvailability {
  providers: AuthProvider[];
  /**
   * Info: (20260810 - Luphia) 唯一能完成 OAuth 流程的 origin。
   * state token 存在 sessionStorage（依 origin 隔離），而 redirect_uri 又必須與
   * Google Console 註冊的網址完全相符，所以整段流程只能在這個 origin 上進行。
   */
  canonicalOrigin: string | null;
}

// Info: (20260809 - Luphia) 查詢本環境啟用了哪些第三方登入方式
export async function fetchEnabledProviders(): Promise<IProviderAvailability> {
  const response = await fetch("/api/v1/auth/oauth/providers");
  return readEnvelope<IProviderAvailability>(response);
}

/**
 * Info: (20260810 - Luphia) 目前瀏覽的 origin 是否能完成 OAuth 流程。
 * 設定缺漏（canonicalOrigin 為 null）時一律放行，避免因為設定問題而誤擋登入。
 */
export function canCompleteOAuthHere(canonicalOrigin: string | null): boolean {
  if (!canonicalOrigin) return true;

  try {
    return isSameEffectiveOrigin(
      new URL(window.location.origin),
      new URL(canonicalOrigin),
    );
  } catch {
    return true;
  }
}

/**
 * Info: (20260809 - Luphia) 取得授權網址並整頁導向 provider。
 * 用整頁導向而非彈出視窗：彈窗常被瀏覽器攔截，且行動裝置體驗較差。
 */
export async function startOAuthFlow(
  provider: AuthProvider,
  options: { intent?: OAuthIntent; returnTo?: string } = {},
): Promise<void> {
  const intent = options.intent ?? "login";
  const redirectUri = buildRedirectUri(provider);

  const response = await fetch(
    `/api/v1/auth/oauth/${provider.toLowerCase()}/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirectUri, returnTo: options.returnTo }),
    },
  );

  const payload = await readEnvelope<{
    authorizationUrl: string;
    stateToken: string;
  }>(response);

  /**
   * Info: (20260809 - Luphia) state token 放 sessionStorage：
   * 只在本分頁存活，關閉分頁即消失，且不會像 cookie 一樣被跨站請求自動帶上。
   */
  sessionStorage.setItem(STATE_STORAGE_KEY, payload.stateToken);
  sessionStorage.setItem(INTENT_STORAGE_KEY, intent);
  if (options.returnTo) {
    sessionStorage.setItem(RETURN_TO_STORAGE_KEY, options.returnTo);
  }

  window.location.href = payload.authorizationUrl;
}

export function takeStoredIntent(): OAuthIntent {
  const intent = sessionStorage.getItem(INTENT_STORAGE_KEY);
  sessionStorage.removeItem(INTENT_STORAGE_KEY);
  return intent === "link" ? "link" : "login";
}

/**
 * Info: (20260809 - Luphia) 綁定流程用：伺服器回應不含 returnTo，
 * 由前端自行記住發起綁定的頁面。只接受站內相對路徑，避免開放轉址。
 *
 * Info: (20260811 - Luphia) 光看開頭是不是 "/" 不夠：`//evil.com` 也以 "/" 開頭，
 * 但瀏覽器會把它當成 protocol-relative 絕對網址，router.replace() 直接把使用者送出站。
 * 反斜線同理（部分瀏覽器視同斜線）。
 */
export function takeStoredReturnTo(): string | null {
  const returnTo = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
  sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  return returnTo && INTERNAL_PATH_PATTERN.test(returnTo) ? returnTo : null;
}

function takeStoredStateToken(): string {
  const stateToken = sessionStorage.getItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(STATE_STORAGE_KEY);

  // Info: (20260809 - Luphia) 找不到 state token 代表流程未由本分頁發起，視為無效
  if (!stateToken) {
    throw new AppError(API_ERRORS.AUTH_OAUTH_STATE_INVALID);
  }
  return stateToken;
}

export async function completeOAuthLogin(params: {
  provider: AuthProvider;
  code: string;
  state: string;
}): Promise<IOAuthLoginPayload> {
  const stateToken = takeStoredStateToken();

  const response = await fetch("/api/v1/auth/oauth/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, stateToken }),
  });

  return readEnvelope<IOAuthLoginPayload>(response);
}

export async function completeOAuthLink(params: {
  provider: AuthProvider;
  code: string;
  state: string;
}): Promise<{ provider: AuthProvider; email: string | null }> {
  const stateToken = takeStoredStateToken();

  const response = await fetch("/api/v1/auth/oauth/link", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("dewt")}`,
    },
    body: JSON.stringify({ ...params, stateToken }),
  });

  return readEnvelope<{ provider: AuthProvider; email: string | null }>(
    response,
  );
}
