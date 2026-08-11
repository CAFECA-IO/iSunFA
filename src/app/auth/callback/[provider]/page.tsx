"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { Role } from "@/constants/role";
import { isAuthProvider, AuthProvider } from "@/constants/auth_provider";
import {
  completeOAuthLink,
  completeOAuthLogin,
  takeStoredIntent,
  takeStoredReturnTo,
} from "@/lib/auth/oauth_client";

/**
 * Info: (20260809 - Luphia) 第三方登入的導回落點。
 * provider 把使用者送回這裡並附上 authorization code，本頁再向後端換取 DeWT。
 * 網址列只會出現一次性的 code，不會出現任何長效憑證。
 */

type CallbackStatus = "EXCHANGING" | "SUCCESS" | "FAILED";

function OAuthCallbackContent({ provider }: { provider: AuthProvider }) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();

  const [status, setStatus] = useState<CallbackStatus>("EXCHANGING");
  const [error, setError] = useState<string | null>(null);

  /**
   * Info: (20260809 - Luphia) React 18 嚴格模式下 effect 會執行兩次，
   * 而 authorization code 只能兌換一次，故用 ref 上鎖。
   */
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const providerError = searchParams.get("error");

    const finish = async () => {
      if (providerError) {
        setError(t("auth_modal.oauth_canceled"));
        setStatus("FAILED");
        return;
      }

      if (!code || !state) {
        setError(t("auth_modal.oauth_failed"));
        setStatus("FAILED");
        return;
      }

      const intent = takeStoredIntent();

      try {
        if (intent === "link") {
          await completeOAuthLink({ provider, code, state });
          setStatus("SUCCESS");
          // Info: (20260809 - Luphia) 綁定不改變登入狀態，回到發起綁定的頁面即可
          const statePayload = takeStoredReturnTo();
          router.replace(statePayload || "/user/account_book/");
          return;
        }

        const payload = await completeOAuthLogin({ provider, code, state });

        localStorage.setItem("dewt", payload.dewt);
        localStorage.setItem("user_address", payload.user.address);
        await refreshAuth();
        setStatus("SUCCESS");

        if (
          payload.user.role === Role.SUPER_ADMIN ||
          payload.user.role === Role.ADMIN
        ) {
          router.replace("/admin/dashboard");
        } else {
          router.replace(payload.returnTo || "/user/account_book/");
        }
      } catch (err: unknown) {
        console.error("OAuth callback failed:", err);
        setError(
          err instanceof Error ? err.message : t("auth_modal.oauth_failed"),
        );
        setStatus("FAILED");
      }
    };

    finish();
  }, [provider, searchParams, router, refreshAuth, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        {status === "FAILED" ? (
          <>
            <AlertCircle
              className="mx-auto h-10 w-10 text-red-500"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">
              {t("auth_modal.oauth_failed")}
            </h1>
            {error && <p className="mt-2 text-sm text-gray-500">{error}</p>}
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-6 w-full rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-500"
            >
              {t("auth_modal.oauth_back_home")}
            </button>
          </>
        ) : (
          <>
            <Loader2
              className="mx-auto h-10 w-10 animate-spin text-orange-600"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-lg font-semibold text-gray-900">
              {t("auth_modal.oauth_exchanging")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("auth_modal.oauth_exchanging_desc")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);
  const normalized = provider.toUpperCase();

  // Info: (20260809 - Luphia) 未知的 provider 直接退回首頁，不進入交換流程
  if (!isAuthProvider(normalized)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <OAuthCallbackContent provider={normalized} />
    </Suspense>
  );
}
