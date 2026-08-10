import { AuthProvider, AUTH_PROVIDER_VALUES } from "@/constants/auth_provider";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { IOAuthProvider } from "@/interfaces/oauth";
import { googleOAuthProvider } from "@/lib/auth/oauth/google.provider";

/**
 * Info: (20260809 - Luphia) 登入方式的唯一註冊表。
 * 要支援 Apple / Microsoft / LINE 時，只需在這裡多掛一個 IOAuthProvider 實作，
 * API、Service 與前端都不必改動。
 */
const OAUTH_PROVIDERS: Record<AuthProvider, IOAuthProvider> = {
  [AuthProvider.GOOGLE]: googleOAuthProvider,
};

export async function getOAuthProvider(
  provider: AuthProvider,
): Promise<IOAuthProvider> {
  const impl = OAUTH_PROVIDERS[provider];
  if (!impl) {
    throw new AppError(API_ERRORS.AUTH_PROVIDER_UNSUPPORTED);
  }
  if (!(await impl.isConfigured())) {
    throw new AppError(API_ERRORS.AUTH_PROVIDER_NOT_CONFIGURED);
  }
  return impl;
}

// Info: (20260809 - Luphia) 供前端決定要不要渲染某個登入按鈕；未設定金鑰的 provider 不外露
export async function listEnabledProviders(): Promise<AuthProvider[]> {
  const checks = await Promise.all(
    AUTH_PROVIDER_VALUES.map(async (provider) => ({
      provider,
      enabled: (await OAUTH_PROVIDERS[provider]?.isConfigured()) ?? false,
    })),
  );

  return checks.filter((entry) => entry.enabled).map((entry) => entry.provider);
}
