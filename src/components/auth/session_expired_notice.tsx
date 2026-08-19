"use client";

import { AlertCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260814 - Luphia) 登入過期的全域提示。
 *
 * 過期本身不可避免，真正讓人困惑的是它**無聲**：每個呼叫端各自把 401 吞成
 * 「沒有資料」，於是畫面上只剩「團隊選單是空的」「按鈕停用、點了沒反應」，
 * 而使用者以為是功能壞了——實測就是這樣被回報的（購買點數選不到團隊錢包）。
 *
 * 這裡是那件事的唯一出口：只要任何 API 回 401，就明白說出「登入已過期」並給重新登入的路。
 */
export default function SessionExpiredNotice() {
  const { sessionExpired, dismissSessionExpired } = useAuth();
  const { t } = useTranslation();

  if (!sessionExpired) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4"
    >
      <div className="flex w-full max-w-xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 text-sm text-amber-900">
          <p className="font-semibold">{t("auth_modal.session_expired")}</p>
          <p className="mt-1 text-xs text-amber-800">
            {t("auth_modal.session_expired_hint")}
          </p>
        </div>
        {/**
         * Info: (20260814 - Luphia) 重新登入走既有的登入入口（頁面各處都有），
         * 這裡只負責讓人知道發生了什麼；關掉提示不代表恢復登入。
         */}
        <button
          type="button"
          onClick={dismissSessionExpired}
          aria-label={t("common.close")}
          className="shrink-0 rounded-lg p-1 text-amber-700 transition-colors hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
