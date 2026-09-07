"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { AuthProvider } from "@/constants/auth_provider";
import {
  canCompleteOAuthHere,
  fetchEnabledProviders,
  startOAuthFlow,
  OAuthIntent,
} from "@/lib/auth/oauth_client";

/**
 * Info: (20260809 - Luphia) FIDO2 以外的登入方式入口。
 * 只渲染後端回報「已完成設定」的 provider，因此未設定金鑰的環境不會出現壞掉的按鈕。
 * 新增 Apple / Microsoft 等只需補 PROVIDER_LABELS 與圖示，其餘流程共用。
 */

interface ISocialLoginButtonsProps {
  intent?: OAuthIntent;
  returnTo?: string;
  onError?: (message: string) => void;
  disabled?: boolean;
  /**
   * Info: (20260813 - Julian) 是否畫上方那條「或使用以下方式繼續」分隔線。
   *
   * 預設 `true`：這個元件原本永遠是**次要**登入方式，分隔線是它與上方 passkey
   * 按鈕之間的界線。當它是畫面上的主要入口時（例如出勤閘門），
   * 那條線上面什麼都沒有，讀起來像少了一段東西。
   */
  showDivider?: boolean;
}

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const PROVIDER_MARKS: Partial<Record<AuthProvider, () => React.ReactElement>> =
  {
    [AuthProvider.GOOGLE]: GoogleMark,
  };

const PROVIDER_LABEL_KEYS: Record<AuthProvider, string> = {
  [AuthProvider.GOOGLE]: "auth_modal.continue_with_google",
};

export default function SocialLoginButtons({
  intent = "login",
  returnTo = undefined,
  onError = undefined,
  disabled = false,
  showDivider = true,
}: ISocialLoginButtonsProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [canonicalOrigin, setCanonicalOrigin] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    fetchEnabledProviders()
      .then((availability) => {
        if (!active) return;
        setProviders(availability.providers);
        setCanonicalOrigin(availability.canonicalOrigin);
      })
      .catch((err) => {
        // Info: (20260809 - Luphia) 查不到可用 provider 不該擋住 passkey 登入，靜默降級
        console.warn("Failed to load OAuth providers:", err);
      });

    return () => {
      active = false;
    };
  }, []);

  if (providers.length === 0) return null;

  /**
   * Info: (20260810 - Luphia) 非 canonical origin 上按下去註定失敗（伺服器會以
   * open redirect 防護拒絕 redirect_uri），所以直接把按鈕停用並說明該去哪個網址。
   * 刻意不隱藏按鈕：使用者更難理解「功能不見了」，不如明確說明原因。
   */
  const originMismatch = !canCompleteOAuthHere(canonicalOrigin);

  const handleClick = async (provider: AuthProvider) => {
    setPendingProvider(provider);
    try {
      await startOAuthFlow(provider, { intent, returnTo });
    } catch (err: unknown) {
      console.error("Failed to start OAuth flow:", err);
      setPendingProvider(null);
      onError?.(
        err instanceof Error ? err.message : t("auth_modal.oauth_failed"),
      );
    }
  };

  return (
    <div className="space-y-3">
      {showDivider && (
        <div className="relative">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-500">
              {t("auth_modal.or_continue_with")}
            </span>
          </div>
        </div>
      )}

      {originMismatch && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {t("auth_modal.oauth_wrong_origin", {
            origin: canonicalOrigin ?? "",
          })}
        </p>
      )}

      {providers.map((provider) => {
        const Mark = PROVIDER_MARKS[provider];
        const isPending = pendingProvider === provider;

        return (
          <button
            key={provider}
            type="button"
            disabled={disabled || originMismatch || pendingProvider !== null}
            onClick={() => handleClick(provider)}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              Mark && <Mark />
            )}
            {t(PROVIDER_LABEL_KEYS[provider])}
          </button>
        );
      })}
    </div>
  );
}
