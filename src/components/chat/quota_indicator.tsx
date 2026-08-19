"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Coins, Gauge, Rocket } from "lucide-react";
import QuotaMeter from "@/components/common/quota_meter";
import type { IAccountBookQuotaView } from "@/interfaces/team_wallet";
import { quotaRemainingPercent } from "@/lib/quota/quota_notice";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Luphia) 費思的常駐額度指示器（產品調整 20260813）。
 *
 * 原本額度只在被擋下時才現身，等於用戶要撞牆才知道牆在哪。改為平時就佔一條窄列，
 * 顯示「較吃緊的那個視窗」的剩餘百分比；點擊才展開兩條儀表、重置時間與導購。
 *
 * 收合狀態只給一個數字是刻意的：對話視窗本來就窄，常駐資訊必須小到不與訊息爭空間。
 * 取兩個視窗的**較小值**——那是實際擋人的那一層，報大的數字等於報喜不報憂。
 */

interface IQuotaIndicatorProps {
  accountBookId?: string;
  // Info: (20260813 - Luphia) 每次送出訊息後 +1，用來重新取用量（額度只會因為對話而變動）
  refreshToken: number;
}

export default function QuotaIndicator({
  accountBookId = undefined,
  refreshToken,
}: IQuotaIndicatorProps) {
  const { t, language } = useTranslation();
  const [view, setView] = useState<IAccountBookQuotaView | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!accountBookId) return;
    let active = true;
    const fetchQuota = async () => {
      try {
        const token = localStorage.getItem("dewt");
        const response = await fetch(
          `/api/v1/user/account_book/${accountBookId}/quota`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = (await response.json()) as {
          success?: boolean;
          payload?: IAccountBookQuotaView | null;
        };
        // Info: (20260813 - Luphia) 取不到就整條隱藏：額度是輔助資訊，不該讓它的失敗擋住對話
        if (active) setView(json.success ? (json.payload ?? null) : null);
      } catch {
        if (active) setView(null);
      }
    };
    fetchQuota();
    return () => {
      active = false;
    };
  }, [accountBookId, refreshToken]);

  if (!view) return null;

  const remaining5h = quotaRemainingPercent(
    view.quota.quota5h.limit,
    view.quota.quota5h.used,
  );
  const remainingWeek = quotaRemainingPercent(
    view.quota.quotaWeek.limit,
    view.quota.quotaWeek.used,
  );
  // Info: (20260813 - Luphia) 收合列報「較吃緊」的那個視窗：它才是會擋下訊息的那一層
  const tightestPercent = Math.min(remaining5h, remainingWeek);
  const hasWallet = BigInt(view.allocationBalance || "0") > BigInt(0);

  const percentColor =
    tightestPercent <= 0
      ? "text-red-600"
      : tightestPercent <= 20
        ? "text-amber-600"
        : "text-gray-600";

  const formatResetAt = (resetAt: number) =>
    new Intl.DateTimeFormat(language, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(resetAt * 1000));

  return (
    <div className="border-t border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
      >
        <Gauge className="h-3.5 w-3.5 shrink-0 text-orange-500" />
        <span className="shrink-0">{t("chat.quota_indicator.label")}</span>
        <span className={`font-semibold tabular-nums ${percentColor}`}>
          {tightestPercent}%
        </span>
        {/**
         * Info: (20260813 - Luphia) 額度見底但錢包還有點數時要說明會自動接續扣抵（設計書 §5.4），
         * 否則 0% 會被讀成「不能用了」，而實際上訊息照樣送得出去。
         */}
        {tightestPercent <= 0 && hasWallet && (
          <span className="truncate text-gray-400">
            {t("chat.quota_indicator.wallet_fallback")}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          <div className="space-y-2">
            <QuotaMeter
              label={t("chat.quota_exceeded.meter_5h")}
              limit={view.quota.quota5h.limit}
              used={view.quota.quota5h.used}
            />
            <p className="text-xs text-gray-400">
              {t("chat.quota_indicator.reset_at", {
                time: formatResetAt(view.quota.quota5h.resetAt),
              })}
            </p>
          </div>

          <div className="space-y-2">
            <QuotaMeter
              label={t("chat.quota_exceeded.meter_week")}
              limit={view.quota.quotaWeek.limit}
              used={view.quota.quotaWeek.used}
            />
            <p className="text-xs text-gray-400">
              {t("chat.quota_indicator.reset_at", {
                time: formatResetAt(view.quota.quotaWeek.resetAt),
              })}
            </p>
          </div>

          <p className="text-xs text-gray-500">
            {t("chat.quota_indicator.spend_order")}
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pricing/credits"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100"
            >
              <Coins className="h-3.5 w-3.5" />
              {t("chat.quota_exceeded.buy_credits")}
            </Link>
            <Link
              href="/pricing/subscription"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
            >
              <Rocket className="h-3.5 w-3.5" />
              {t("chat.quota_exceeded.upgrade_plan")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
