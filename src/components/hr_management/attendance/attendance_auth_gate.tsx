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
 * ## 為什麼需要它
 *
 * 四支出勤 API 都要 DeWT。沒登入時 `getIdentityFromDeWT` 回 null → 401，
 * 而頁面只會顯示一句「無法載入出勤資料」—— 使用者看不出那是**沒登入**，
 * 還是**資料壞了**，也沒有任何地方可以按。
 *
 * 演示第一步正是「在這一頁上登入」，因此登入入口必須就在這一頁上，
 * 而不是要求主講先繞到別的頁面登入再走回來 —— 那會讓開場的敘事斷掉。
 *
 * ## 未登入時不掛載子元件
 *
 * 閘門擋住時 `children` 根本不會 mount，因此不會發出那幾個注定 401 的請求。
 * 讓它們發出去再顯示錯誤，等於在 console 與伺服器 log 裡各留一批雜訊 ——
 * 而演示當天出問題時，第一個要看的就是那兩個地方。
 *
 * ## 三種狀態，不是兩種
 *
 * `loading`（還在確認 DeWT）必須與「未登入」分開：合成一種的話，
 * 每次重新整理都會先閃一下登入畫面再跳回內容，而觀眾會以為剛剛被登出了。
 *
 * ## Google 為主，Passkey 為備援
 *
 * Google 是演示的主線：它接得上公司既有帳號，而且首次登入會以**已驗證的信箱**
 * 自動對上 `Employee.email`，不需要任何人工綁定。
 *
 * Passkey 留在下面折起來，理由只有一個 —— 它是目前唯一**不需要外部網路**的
 * 登入路徑（OAuth 要連得到 `accounts.google.com` 與 JWKS 端點）。
 *
 * **但它救不了同一位員工。** `Employee.userId` 只能指向一個 `User`，而
 * `oauth.service` 絕不用 email 自動合併既有帳號 —— 同一個人的 passkey 帳號與
 * Google 帳號是兩個 `User`。因此 passkey 只對「已由人事事先綁定的帳號」有用，
 * 演示當天真正的備援仍然是事先登入好的分頁（執行手冊 §8 Plan B）。
 *
 * ## 為什麼閘門自己也要查一次 provider
 *
 * `SocialLoginButtons` 在後端回報「沒有任何已設定的 provider」時 `return null`。
 * 那個設計對其他頁面是對的 —— 它們還有 passkey 可用。但這張卡片上 Google 是主線，
 * 於是同一個 `null` 在這裡會變成一塊空白：標題、說明、註腳都在，中間什麼都沒有，
 * 看起來像「按鈕壞了點不下去」。**這個問題已經發生過一次**，所以閘門自己也查一次，
 * 只為了在空的時候有話可說。
 *
 * 三種結果各自要講不同的話 ——「沒設定」要指向 `/admin/settings` 的那兩個鍵，
 * 「查不到」要指向設定快照的狀態，兩者在畫面上長得一樣但要查的地方完全不同。
 *
 * 憑證只放資料庫，不放 `.env`：讀取優先序是 **DB 已驗簽 > env > 保底值**（ADR 017），
 * 兩處都放只會製造「改了 env 卻沒生效」這種最難查的問題。
 *
 * ## 登入之後會離開這一頁再回來
 *
 * OAuth 一定是整頁導向：`SocialLoginButtons` → Google → `/auth/callback/google` →
 * `router.replace(returnTo)`。`returnTo` 帶的是當前路徑，所以四頁各自回到自己。
 *
 * **例外**：callback 對 `ADMIN` / `SUPER_ADMIN` 會無條件導向 `/admin/dashboard`
 * 並忽略 `returnTo`。演示帳號因此不可以是管理員 —— 這一條擋不在這裡，
 * 只能寫在執行手冊的檢查清單上。
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
   * Info: (20260813 - Julian) 環境探測放在 effect 裡，有兩個理由。
   *
   * 1. `window` 在伺服器端不存在，直接在 render 裡讀會讓整頁 SSR 失敗。
   * 2. 就算包了 `typeof window`，伺服器與瀏覽器會算出不同結果 —— 那是 hydration
   *    不一致，React 會拿伺服器那一版的 DOM 給你，按鈕停在錯的狀態。
   *
   * 初值取 `false`（可用）：猜錯的方向要選代價小的那邊。
   *
   * 刻意不用 `fido2ClientService.isAvailable()`：它檢查的是 `client` 這個
   * **模組物件**存不存在，而模組永遠存在，因此它恆為 true，測不出任何東西。
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
       * Info: (20260813 - Julian) 刻意不導頁。
       *
       * `refreshAuth()` 會讓 `user` 有值，閘門下一次 render 就直接放行 `children`。
       * 這是 passkey 相對 OAuth 唯一的好處：它不必離開這一頁。
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
   * Info: (20260813 - Julian) Google 不可用時，備援自動展開。
   *
   * 讓使用者在一張沒有任何可按之物的卡片上自己找到「改用 Passkey」那行小字，
   * 是把診斷責任丟給最不該承擔它的人。
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
           * Info: (20260813 - Julian) `returnTo` 帶當前路徑，登入後回到原本要看的那一頁。
           * `showDivider={false}`：它在這裡是主要入口，上方沒有東西可以分隔。
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
               * Info: (20260813 - Julian) 說清楚它救不了誰。
               *
               * Passkey 帳號沒有信箱，對不上 `Employee.email` ——
               * 沒有事先由人事綁定的帳號，登入會成功但每一頁都顯示「尚未對應到員工檔」。
               * 那句話在演示現場聽起來像系統壞了，先講在前面就變成規則的一部分。
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
         * Info: (20260813 - Julian) 先講清楚下一個最可能卡住的地方。
         *
         * 登入成功之後最常見的失敗是「這個帳號沒有對應的員工檔」——
         * 而那句話在演示現場聽起來像系統壞了。先說在前面，它就變成規則的一部分：
         * 不在名冊上的人打不了這個工地的卡。
         */}
        <p className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-400">
          {t("hr_management.attendance_auth.hint")}
        </p>
      </div>
    </div>
  );
};

export default AttendanceAuthGate;
