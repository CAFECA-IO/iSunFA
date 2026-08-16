"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Users, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import AuthModal from "@/components/auth/auth_modal";

/**
 * Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）。
 *
 * 未登入也看得到「是哪個團隊邀請你」——受邀者多半還沒有帳號，
 * 而先要求註冊、註冊完才說明來意，是最容易讓人中途離開的順序。
 *
 * 登入狀態改變時自動接受：使用者在本頁完成註冊或登入後，
 * 不必再回頭找那顆按鈕。
 */

type PageStatus = "LOADING" | "READY" | "ACCEPTING" | "ACCEPTED" | "INVALID";

interface IInviteView {
  teamId: string;
  teamName: string;
  role: string;
  expiresAt: string | null;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<PageStatus>("LOADING");
  const [invite, setInvite] = useState<IInviteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/v1/invite/${token}`);
        const json = await res.json();
        if (cancelled) return;
        if (json.success && json.payload) {
          setInvite(json.payload);
          setStatus("READY");
        } else {
          setStatus("INVALID");
        }
      } catch {
        if (!cancelled) setStatus("INVALID");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = useCallback(async () => {
    setStatus("ACCEPTING");
    setError(null);
    try {
      const dewt = localStorage.getItem("dewt");
      const res = await fetch(`/api/v1/invite/${token}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dewt}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setStatus("ACCEPTED");
        // Info: (20260815 - Luphia) 讓成功畫面停留一下再導頁，否則會像什麼都沒發生
        setTimeout(() => router.push("/user/team"), 1200);
      } else {
        setError(json.message || t("invite_page.accept_failed"));
        setStatus("READY");
      }
    } catch {
      setError(t("invite_page.accept_failed"));
      setStatus("READY");
    }
  }, [token, router, t]);

  /**
   * Info: (20260815 - Luphia) 只有「在本頁完成登入或註冊」才自動接受（規範 §5.3）。
   *
   * 刻意不寫成「偵測到已登入就自動加入」：邀請信會被轉寄，而轉寄後點開連結的人
   * 可能正登入著另一個帳號——那樣會把不相干的帳號靜默加進團隊。
   * 本來就登入著的人看到的是一顆按鈕，加入是他自己按下的。
   */
  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    accept();
  }, [accept]);

  const isBusy = status === "LOADING" || status === "ACCEPTING" || authLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        {status === "LOADING" && (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-orange-500" />
            <p className="text-gray-600">{t("invite_page.loading")}</p>
          </>
        )}

        {status === "INVALID" && (
          <>
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">
              {t("invite_page.invalid_title")}
            </h1>
            <p className="text-sm text-gray-600">
              {t("invite_page.invalid_description")}
            </p>
          </>
        )}

        {status === "ACCEPTED" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-500" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">
              {t("invite_page.joined_title")}
            </h1>
            <p className="text-sm text-gray-600">
              {t("invite_page.joined_description")}
            </p>
          </>
        )}

        {(status === "READY" || status === "ACCEPTING") && invite && (
          <>
            <Users className="mx-auto mb-4 h-10 w-10 text-orange-500" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">
              {t("invite_page.title", { team: invite.teamName })}
            </h1>
            <p className="mb-6 text-sm text-gray-600">
              {t("invite_page.role_note", {
                role: t(`team_management.roles.${invite.role}`),
              })}
            </p>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {user ? (
              <button
                type="button"
                onClick={accept}
                disabled={isBusy}
                className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {status === "ACCEPTING" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("invite_page.accept")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
                >
                  {t("invite_page.login_to_accept")}
                </button>
                <p className="mt-3 text-xs text-gray-500">
                  {t("invite_page.login_hint")}
                </p>
              </>
            )}
          </>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
