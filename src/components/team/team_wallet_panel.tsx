"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Gauge, Coins, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { TEAM_WALLET_STATUS } from "@/constants/subscription_quota";

/**
 * Info: (20260809 - Luphia) 團隊錢包與訂閱額度面板（產品調整 20260809 後的職責）：
 * - 額度儀表：5 小時 / 週雙視窗用量與重置倒數（resetAt 由後端揭露，前端只做倒數）
 * - 管理者錢包卡：未分配池餘額 + 導購連結（/pricing/credits）
 * - FROZEN 告警（所有成員可見，消費會被擋）
 * 點數分配操作與各成員分配餘額改由成員清單承載（team/page.tsx），
 * 錢包資料由頁面單一 fetch 後傳入，本元件只負責訂閱額度的取得與呈現。
 */

interface IQuotaWindow {
  limit: string;
  used: string;
  resetAt: number;
}

interface ISubscriptionView {
  planId: string;
  quota: { quota5h: IQuotaWindow; quotaWeek: IQuotaWindow };
  faithTokensPerCredit: number;
}

export interface ITeamWalletInfo {
  status: string;
  // Info: (20260809 - Luphia) 管理職限定欄位：一般成員的回應不含此欄
  unallocatedBalance?: string;
  myAllocationBalance: string;
  allocations?: { userId: string; balance: string }[];
}

interface ITeamWalletPanelProps {
  teamId: string;
  wallet: ITeamWalletInfo | null;
  isManager: boolean;
}

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "00:00:00";
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const hms = [hours, minutes, seconds]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
  return days > 0 ? `${days}d ${hms}` : hms;
}

function QuotaMeter({
  label,
  window,
  nowSec,
  resetLabel,
}: {
  label: string;
  window: IQuotaWindow;
  nowSec: number;
  resetLabel: string;
}) {
  const limit = Number(window.limit);
  const used = Number(window.used);
  const ratio = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const barColor =
    ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-orange-500";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {window.used} / {window.limit}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400 tabular-nums">
        {resetLabel} {formatCountdown(window.resetAt - nowSec)}
      </p>
    </div>
  );
}

export default function TeamWalletPanel({
  teamId,
  wallet,
  isManager,
}: ITeamWalletPanelProps) {
  const { t } = useTranslation();

  const [subscription, setSubscription] = useState<ISubscriptionView | null>(
    null,
  );
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/user/team/${teamId}/subscription`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dewt")}`,
        },
      }).then((r) => r.json());
      if (res.success) setSubscription(res.payload);
    } catch (err) {
      console.error("[TeamWalletPanel] subscription fetch failed:", err);
    }
  }, [teamId]);

  useEffect(() => {
    setSubscription(null);
    fetchSubscription();
  }, [fetchSubscription]);

  // Info: (20260807 - Luphia) 重置倒數：每秒 tick；resetAt 過期即重新拉額度（新視窗歸零）
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec((prev) => {
        const next = Math.floor(Date.now() / 1000);
        const reset5h = subscription?.quota.quota5h.resetAt ?? 0;
        if (prev < reset5h && next >= reset5h) fetchSubscription();
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [subscription, fetchSubscription]);

  if (!subscription && !wallet) return null;

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
        <Wallet className="size-5 shrink-0 text-orange-600" />
        {t("team_management.wallet.title")}
      </h3>

      {wallet?.status === TEAM_WALLET_STATUS.FROZEN && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ShieldAlert className="size-4 shrink-0" />
          {t("team_management.wallet.frozen_warning")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {subscription && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Gauge className="size-4 shrink-0 text-orange-600" />
                {t("team_management.wallet.quota_title")}
              </span>
              <span className="rounded-full bg-orange-600/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 uppercase">
                {subscription.planId}
              </span>
            </div>
            <div className="space-y-4">
              <QuotaMeter
                label={t("team_management.wallet.quota_5h")}
                window={subscription.quota.quota5h}
                nowSec={nowSec}
                resetLabel={t("team_management.wallet.reset_in")}
              />
              <QuotaMeter
                label={t("team_management.wallet.quota_week")}
                window={subscription.quota.quotaWeek}
                nowSec={nowSec}
                resetLabel={t("team_management.wallet.reset_in")}
              />
            </div>
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
              {t("team_management.wallet.faith_rate", {
                rate: subscription.faithTokensPerCredit,
              })}
            </p>
          </div>
        )}

        {isManager && wallet && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Coins className="size-4 shrink-0 text-orange-600" />
              {t("team_management.wallet.balance_title")}
            </span>
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                {t("team_management.wallet.pool_balance")}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                {wallet.unallocatedBalance ?? "0"}
              </p>
            </div>

            {/* Info: (20260809 - Luphia) 團隊管理不內嵌購買流程：引導至 /pricing/credits */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                {t("team_management.wallet.buy_credits_hint")}
              </p>
              <Link
                href="/pricing/credits"
                className="shrink-0 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
              >
                {t("team_management.wallet.buy_credits")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
