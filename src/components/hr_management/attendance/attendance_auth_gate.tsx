"use client";

import { FC, ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Fingerprint, Loader2, LogIn } from "lucide-react";
import SocialLoginButtons from "@/components/auth/social_login_buttons";
import { AuthProvider } from "@/constants/auth_provider";
import { fetchEnabledProviders } from "@/lib/auth/oauth_client";
import { loginWithPasskey } from "@/lib/auth/passkey_login";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260813 - Julian) 出勤各頁的登入閘門。
 *
 * 未登入時不掛載 children，避免發出注定 401 的請求；loading／未登入／已登入
 * 三種狀態不可合併，否則重新整理會閃一下登入畫面。Google 為主要登入方式，
 * Passkey 為備援，兩者是不同的 User、不會用 email 自動合併，Passkey 僅對
 * 已由人事事先綁定的帳號有用。OAuth callback 對 ADMIN／SUPER_ADMIN 會忽略
 * returnTo 導向 /admin/dashboard，因此登入帳號不可以是管理員。
 */

type ProviderState =
  | { status: "checking" }
  | { status: "available" }
  | { status: "unconfigured" }
  | { status: "unreachable" };

const AttendanceAuthGate: FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user, loading, refreshAuth } = useAuth();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [passkeyUnavailable, setPasskeyUnavailable] = useState(false);
  const [passkeyRequested, setPasskeyRequested] = useState(false);
  const [providerState, setProviderState] = useState<ProviderState>({
    status: "checking",
  });

  /**
   * Info: (20260813 - Julian) 探測環境是否支援 passkey，需放在 effect 裡：
   * `window` 在伺服器端不存在，直接於 render 讀會讓 SSR 失敗或造成 hydration 不一致。
   * 不用 `fido2ClientService.isAvailable()`——它測的是模組是否存在，恆為 true。
   */
  useEffect(() => {
    setPasskeyUnavailable(
      !window.PublicKeyCredential || !window.isSecureContext,
    );
  }, []);

  useEffect(() => {
    // Info: (20260813 - Julian) 已登入或還在確認身分時不必問，問了也不會顯示
    if (loading || user) return undefined;

    let active = true;

    fetchEnabledProviders()
      .then((availability) => {
        if (!active) return;
        setProviderState({
          status: availability.providers.includes(AuthProvider.GOOGLE)
            ? "available"
            : "unconfigured",
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        // Info: (20260813 - Julian) 保留原始錯誤，設定快照 UNTRUSTED 時只有這裡看得到
        console.warn("Failed to load OAuth providers:", err);
        setProviderState({ status: "unreachable" });
      });

    return () => {
      active = false;
    };
  }, [loading, user]);

  const handlePasskeyLogin = async () => {
    setPending(true);
    setError(null);

    try {
      await loginWithPasskey();

      /**
       * Info: (20260813 - Julian) 刻意不導頁：`refreshAuth()` 讓 `user` 有值後，
       * 閘門下一次 render 就會放行 `children`。
       */
      await refreshAuth();
    } catch (err: unknown) {
      const canceled =
        err instanceof AppError &&
        err.apiCode === API_ERRORS.AUTH_USER_CANCELED.code;

      if (canceled) {
        // Info: (20260813 - Julian) 使用者自己按取消，不是故障，不必留 console 噪音
        setError(t("hr_management.attendance_auth.passkey_canceled"));
      } else {
        console.error("Passkey login failed:", err);
        setError(t("hr_management.attendance_auth.passkey_failed"));
      }
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500 sm:px-6 lg:px-8">
        <Loader2 className="size-4 animate-spin" />
        {t("hr_management.attendance_auth.checking")}
      </div>
    );
  }

  if (user) return <>{children}</>;

  const googleUnavailable =
    providerState.status === "unconfigured" ||
    providerState.status === "unreachable";

  /**
   * Info: (20260813 - Julian) Google 不可用時備援自動展開，避免使用者要自己
   * 找到「改用 Passkey」的小字。
   */
  const passkeyExpanded = passkeyRequested || googleUnavailable;

  const notice =
    providerState.status === "unconfigured"
      ? {
          title: t("hr_management.attendance_auth.provider_unconfigured"),
          detail: t("hr_management.attendance_auth.provider_unconfigured_hint"),
        }
      : {
          title: t("hr_management.attendance_auth.provider_unreachable"),
          detail: t("hr_management.attendance_auth.provider_unreachable_hint"),
        };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 ring-1 ring-gray-200">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <LogIn className="size-5 text-orange-500" />
          {t("hr_management.attendance_auth.title")}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {t("hr_management.attendance_auth.description")}
        </p>

        <div className="mt-6 space-y-3">
          {providerState.status === "checking" && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="size-4 animate-spin" />
              {t("hr_management.attendance_auth.provider_checking")}
            </div>
          )}

          {/**
           * Info: (20260813 - Julian) `returnTo` 帶當前路徑，登入後回到原頁；
           * `showDivider={false}`：這裡是主要入口，上方無需分隔線。
           */}
          {providerState.status === "available" && (
            <SocialLoginButtons
              returnTo={pathname}
              onError={setError}
              showDivider={false}
            />
          )}

          {googleUnavailable && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <AlertTriangle className="size-4" />
                {notice.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                {notice.detail}
              </p>
            </div>
          )}

          {!passkeyExpanded && (
            <button
              type="button"
              onClick={() => setPasskeyRequested(true)}
              className="w-full text-center text-xs text-gray-400 underline-offset-2 transition hover:text-gray-600 hover:underline"
            >
              {t("hr_management.attendance_auth.passkey_toggle")}
            </button>
          )}

          {passkeyExpanded && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                disabled={pending || passkeyUnavailable}
                onClick={handlePasskeyLogin}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Fingerprint className="size-5" aria-hidden="true" />
                )}
                {pending
                  ? t("hr_management.attendance_auth.passkey_pending")
                  : t("hr_management.attendance_auth.passkey_action")}
              </button>

              {/**
               * Info: (20260813 - Julian) Passkey 帳號沒有信箱，對不上 `Employee.email`——
               * 未經人事綁定的帳號登入會成功，但每頁都顯示尚未對應到員工檔。
               */}
              <p className="text-xs leading-relaxed text-gray-400">
                {t("hr_management.attendance_auth.passkey_fallback_hint")}
              </p>

              {passkeyUnavailable && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {t("hr_management.attendance_auth.passkey_unavailable")}
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {error}
          </div>
        )}

        {/**
         * Info: (20260813 - Julian) 登入成功後最常見的失敗是帳號沒有對應的員工檔，
         * 先在畫面上提示，避免使用者誤以為系統壞了。
         */}
        <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
          {t("hr_management.attendance_auth.hint")}
        </p>
      </div>
    </div>
  );
};

export default AttendanceAuthGate;
