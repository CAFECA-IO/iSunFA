"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Gauge, Coins, ShieldAlert, AlertCircle } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { TEAM_WALLET_STATUS } from "@/constants/subscription_quota";
// Info: (20260813 - Luphia) 額度儀表抽為共用元件，與費思的額度不足提示同一份實作
import QuotaMeter from "@/components/common/quota_meter";

/**
 * Info: (20260809 - Luphia) 團隊錢包與訂閱額度面板（產品調整 20260809 後的職責）：
 * - 額度儀表：5 小時 / 週雙視窗，僅百分比進度條（不揭露數字與倒數）
 * - 管理者錢包卡：未分配池餘額 + 導購連結（/pricing/credits）
 * - FROZEN 告警（所有成員可見，消費會被擋）
 * 點數分配操作與各成員分配餘額改由成員清單承載（team/page.tsx），
 * 錢包資料由頁面單一 fetch 後傳入，本元件只負責訂閱額度的取得與呈現。
 *
 * 兩張卡片各自呈現載入 / 失敗狀態並可重試：載入失敗時**絕不靜默隱藏**——
 * 靜默隱藏會讓「功能沒上」與「功能壞了」無從分辨，實際造成過多次誤判。
 */

export type TeamWalletFetchStatus = "loading" | "error" | "ready";

interface IQuotaWindow {
  limit: string;
  used: string;
  resetAt: number;
}

interface ISubscriptionView {
  planId: string;
  quota: { quota5h: IQuotaWindow; quotaWeek: IQuotaWindow };
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
  walletStatus: TeamWalletFetchStatus;
  isManager: boolean;
  onRetryWallet: () => void;
}

/**
 * Info: (20260809 - Luphia) 卡片外殼：統一承載載入骨架與失敗提示（含重試），
 * 讓「還在載入」「載入失敗」「沒有資料」三種狀態在畫面上可分辨。
 */
function PanelCard({
  title,
  icon,
  status,
  onRetry,
  headerExtra = null,
  children,
}: {
  title: string;
  icon: ReactNode;
  status: TeamWalletFetchStatus;
  onRetry: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {icon}
          {title}
        </span>
        {status === "ready" && headerExtra}
      </div>

      {status === "loading" && (
        <div className="animate-pulse space-y-3" aria-busy="true">
          <div className="bg-surface-hover h-2 w-full rounded-full" />
          <div className="bg-surface-hover h-2 w-2/3 rounded-full" />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            {t("team_management.wallet.load_failed")}
          </span>
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {t("team_management.wallet.retry")}
          </button>
        </div>
      )}

      {status === "ready" && children}
    </div>
  );
}

export default function TeamWalletPanel({
  teamId,
  wallet,
  walletStatus,
  isManager,
  onRetryWallet,
}: ITeamWalletPanelProps) {
  const { t } = useTranslation();

  const [subscription, setSubscription] = useState<ISubscriptionView | null>(
    null,
  );
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<TeamWalletFetchStatus>("loading");

  const fetchSubscription = useCallback(async () => {
    setSubscriptionStatus("loading");
    try {
      const res = await fetch(`/api/v1/user/team/${teamId}/subscription`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("dewt")}`,
        },
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.message || "subscription failed");
      setSubscription(res.payload);
      setSubscriptionStatus("ready");
    } catch (err) {
      console.error("[TeamWalletPanel] subscription fetch failed:", err);
      setSubscriptionStatus("error");
    }
  }, [teamId]);

  useEffect(() => {
    setSubscription(null);
    fetchSubscription();
  }, [fetchSubscription]);

  /**
   * Info: (20260809 - Luphia) 倒數顯示已移除（僅百分比進度條），
   * 但仍於 5h 視窗 resetAt 到點時自動重拉額度，讓進度條歸零不顯示過期資料
   */
  useEffect(() => {
    const reset5h = subscription?.quota.quota5h.resetAt;
    if (!reset5h) return undefined;
    const delayMs = reset5h * 1000 - Date.now();
    if (delayMs <= 0) return undefined;
    const timer = setTimeout(() => fetchSubscription(), delayMs + 1000);
    return () => clearTimeout(timer);
  }, [subscription, fetchSubscription]);

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
        <PanelCard
          title={t("team_management.wallet.quota_title")}
          icon={<Gauge className="size-4 shrink-0 text-orange-600" />}
          status={subscriptionStatus}
          onRetry={fetchSubscription}
          headerExtra={
            <span className="rounded-full bg-orange-600/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 uppercase">
              {subscription?.planId}
            </span>
          }
        >
          {subscription && (
            <div className="space-y-4">
              <QuotaMeter
                label={t("team_management.wallet.quota_5h")}
                limit={subscription.quota.quota5h.limit}
                used={subscription.quota.quota5h.used}
              />
              <QuotaMeter
                label={t("team_management.wallet.quota_week")}
                limit={subscription.quota.quotaWeek.limit}
                used={subscription.quota.quotaWeek.used}
              />
            </div>
          )}
        </PanelCard>

        {isManager && (
          <PanelCard
            title={t("team_management.wallet.balance_title")}
            icon={<Coins className="size-4 shrink-0 text-orange-600" />}
            status={walletStatus}
            onRetry={onRetryWallet}
          >
            <div>
              <p className="text-xs text-gray-500">
                {t("team_management.wallet.pool_balance")}
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                {wallet?.unallocatedBalance ?? "0"}
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
          </PanelCard>
        )}
      </div>
    </div>
  );
}
