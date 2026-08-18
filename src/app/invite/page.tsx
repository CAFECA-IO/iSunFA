"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import AuthModal from "@/components/auth/auth_modal";
import {
  forgetInviteToken,
  rememberInviteToken,
  resolveInviteToken,
} from "@/lib/team/invite_token_storage";

/**
 * Info: (20260815 - Luphia) email 邀請的落地頁（規範 §4 / P4）。
 *
 * 未登入也看得到「是哪個團隊邀請你」——受邀者多半還沒有帳號，
 * 而先要求註冊、註冊完才說明來意，是最容易讓人中途離開的順序。
 *
 * 登入狀態改變時自動接受：使用者在本頁完成註冊或登入後，
 * 不必再回頭找那顆按鈕。
 *
 * Info: (20260818 - Luphia) token 由 **URL fragment** 取得（第三輪 D）。
 *
 * `#` 之後的內容不會送給伺服器，因此那把有效七天的鑰匙不會進 access log，
 * 也不會出現在 `Referer` 裡（理由詳見 `buildInviteUrl`）。代價是它只在
 * 瀏覽器裡拿得到，所以本頁必須是 client component（本來就是），
 * 而 token 是靠 `location.hash` 讀出來、放進 POST body 送回去的。
 *
 * 讀出來之後立刻把 hash 從網址上抹掉：留著它，使用者按上一頁或分享網址時
 * 又會把 token 帶出去，而該做的事此時已經做完了。
 */

type PageStatus =
  | "LOADING"
  | "READY"
  | "ACCEPTING"
  | "ACCEPTED"
  | "DECLINING"
  | "DECLINED"
  | "INVALID";

interface IInviteView {
  teamId: string;
  teamName: string;
  role: string;
  expiresAt: string | null;
}

export default function InvitePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<PageStatus>("LOADING");
  const [invite, setInvite] = useState<IInviteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  /**
   * Info: (20260818 - Luphia) 從 fragment 取出 token，抹掉網址上的 hash，
   * 並在**本分頁**內留一份備援。
   *
   * `history.replaceState` 不會觸發導航，因此不會重跑這支 effect。
   *
   * Info: (20260818 - Luphia) 備援是必要的（第四輪 B-4）。
   *
   * 只抹掉 hash 而不留備援的話，按 F5、或在 passkey 對話框按取消之後重來，
   * token 就消失了——畫面直接變成「連結無效」，使用者得回信箱重點一次連結。
   * 那是這次修改自己引入的體感回歸。
   *
   * 用 `sessionStorage` 而不是 `localStorage`：它只活在這個分頁，關掉即消失，
   * 而且完成（接受或拒絕）之後立即清掉。這仍然守住原本的目的——
   * token 不進 access log、不進 `Referer`、不留在可分享的網址裡。
   */
  useEffect(() => {
    /**
     * Info: (20260818 - Luphia) 取得規則抽到 `invite_token_storage`（第五輪 T-9）。
     * 這裡只剩「把瀏覽器的東西接進來」與副作用；規則本身有純函式測試。
     */
    const { token: resolved, source } = resolveInviteToken(
      window.location.hash,
      window.sessionStorage,
    );

    if (!resolved) {
      setStatus("INVALID");
      return;
    }

    setToken(resolved);
    if (source === "hash") {
      rememberInviteToken(window.sessionStorage, resolved);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  /**
   * Info: (20260818 - Luphia) 連結失效時也要清掉備援（第五輪低）。
   *
   * 原本只在接受／拒絕成功時清除，於是一封失效的邀請會把 token 留在
   * `sessionStorage` 裡；使用者按上一頁回到已被 `replaceState` 抹成 `/invite`
   * 的歷史項時，又會拿它重試一次同一封失效的邀請。
   *
   * 殘留的情形（誠實記下）：**未處理**的邀請仍會留著備援，因此在同一個分頁裡
   * 先開 A 再開 B、之後回到沒有 hash 的 `/invite`，看到的是 B。
   * 那是「續作最後一封未處理的邀請」，我認為比「一律失效」合理；
   * 而以 token 雜湊當鍵解不了這件事——沒有 hash 時根本不知道要找哪一把。
   */
  useEffect(() => {
    if (status === "INVALID") {
      forgetInviteToken(window.sessionStorage);
    }
  }, [status]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/invite/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
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
    // Info: (20260818 - Luphia) 沒有 token 就沒有可接受的邀請（hash 被清掉或直接開網址）
    if (!token) return;
    setStatus("ACCEPTING");
    setError(null);
    try {
      const dewt = localStorage.getItem("dewt");
      const res = await fetch("/api/v1/invite/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dewt}`,
        },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json.success) {
        // Info: (20260818 - Luphia) 用掉了就清掉備援（第四輪 B-4）
        forgetInviteToken(window.sessionStorage);
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
   * Info: (20260816 - Luphia) 拒絕邀請（條款 §3.6）。
   *
   * 不需要登入——受邀者多半還沒有帳號，而拒絕不需要知道他是誰。
   * 這顆按鈕的價值在於**席次當場空出來**：不按的話那一席會佔到七天後逾期，
   * 而管理員在那之前不知道對方其實沒有要加入。
   */
  const decline = useCallback(async () => {
    if (!token) return;
    setStatus("DECLINING");
    setError(null);
    try {
      const res = await fetch("/api/v1/invite/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (json.success) {
        forgetInviteToken(window.sessionStorage);
        setStatus("DECLINED");
      } else {
        setError(json.message || t("invite_page.decline_failed"));
        setStatus("READY");
      }
    } catch {
      setError(t("invite_page.decline_failed"));
      setStatus("READY");
    }
  }, [token, t]);

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

  const isBusy =
    status === "LOADING" ||
    status === "ACCEPTING" ||
    status === "DECLINING" ||
    authLoading;

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

        {status === "DECLINED" && (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-gray-400" />
            <h1 className="mb-2 text-lg font-semibold text-gray-900">
              {t("invite_page.declined_title")}
            </h1>
            <p className="text-sm text-gray-600">
              {t("invite_page.declined_description")}
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

        {(status === "READY" ||
          status === "ACCEPTING" ||
          status === "DECLINING") &&
          invite && (
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

              {/**
               * Info: (20260816 - Luphia) 拒絕不需要登入，因此兩種情況都顯示。
               * 位置與樣式刻意低調——這是次要動作，但它必須在，
               * 否則不想加入的人只能關掉分頁，而那一席會佔到七天後逾期。
               */}
              <button
                type="button"
                onClick={decline}
                disabled={isBusy}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
              >
                {status === "DECLINING" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("invite_page.decline")}
              </button>
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
