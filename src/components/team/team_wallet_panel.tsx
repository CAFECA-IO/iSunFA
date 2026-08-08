"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Gauge,
  Coins,
  ShieldAlert,
  ArrowRightLeft,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ALLOCATION_DIRECTION } from "@/constants/subscription_quota";

/**
 * Info: (20260807 - Luphia) 團隊錢包與訂閱額度面板（設計書 §9 P4 前端）。
 * - 額度儀表：5 小時 / 週雙視窗用量與重置倒數（resetAt 由後端揭露，前端只做倒數）
 * - 錢包卡：未分配池、我的分配餘額、FROZEN 告警
 * - 管理者（OWNER / ADMIN）：分配 / 收回；購買一律引導至 /pricing/credits（20260809 產品決策）
 * 費思費率等數字一律取自 API（env 同源），嚴禁寫死。
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

interface IWalletView {
  status: string;
  unallocatedBalance: string;
  myAllocationBalance: string;
  allocations?: { userId: string; balance: string }[];
}

interface IPanelMember {
  userId: string;
  role: string;
  user?: { address: string; name: string | null };
}

interface ITeamWalletPanelProps {
  teamId: string;
  members: IPanelMember[];
  isManager: boolean;
  showAlert: (message: string, title?: string) => void;
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
  members,
  isManager,
  showAlert,
}: ITeamWalletPanelProps) {
  const { t } = useTranslation();

  const [subscription, setSubscription] = useState<ISubscriptionView | null>(
    null,
  );
  const [wallet, setWallet] = useState<IWalletView | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const [allocTarget, setAllocTarget] = useState("");
  const [allocAmount, setAllocAmount] = useState("");
  const [allocating, setAllocating] = useState(false);

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("dewt")}`,
      "Content-Type": "application/json",
    }),
    [],
  );

  const fetchWalletState = useCallback(async () => {
    try {
      const [subRes, walletRes] = await Promise.all([
        fetch(`/api/v1/user/team/${teamId}/subscription`, {
          headers: authHeaders(),
        }).then((r) => r.json()),
        fetch(`/api/v1/user/team/${teamId}/wallet`, {
          headers: authHeaders(),
        }).then((r) => r.json()),
      ]);
      if (subRes.success) setSubscription(subRes.payload);
      if (walletRes.success) setWallet(walletRes.payload);
    } catch (err) {
      console.error("[TeamWalletPanel] fetch failed:", err);
    }
  }, [teamId, authHeaders]);

  useEffect(() => {
    setSubscription(null);
    setWallet(null);
    fetchWalletState();
  }, [fetchWalletState]);

  // Info: (20260807 - Luphia) 重置倒數：每秒 tick；resetAt 過期即重新拉額度（新視窗歸零）
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec((prev) => {
        const next = Math.floor(Date.now() / 1000);
        const reset5h = subscription?.quota.quota5h.resetAt ?? 0;
        if (prev < reset5h && next >= reset5h) fetchWalletState();
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [subscription, fetchWalletState]);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        userId: m.userId,
        label: m.user?.name || m.user?.address || m.userId,
      })),
    [members],
  );

  const handleAllocation = async (direction: string) => {
    if (allocating) return;
    if (!allocTarget || !allocAmount || !/^\d+$/.test(allocAmount)) {
      showAlert(t("team_management.wallet.invalid_amount"));
      return;
    }
    setAllocating(true);
    try {
      const res = await fetch(
        `/api/v1/user/team/${teamId}/wallet/allocations`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            userId: allocTarget,
            amount: allocAmount,
            direction,
            idempotencyKey: `ui:${teamId}:${allocTarget}:${direction}:${allocAmount}:${Date.now()}`,
          }),
        },
      ).then((r) => r.json());
      if (!res.success) {
        throw new Error(
          res.message || t("team_management.wallet.allocation_failed"),
        );
      }
      setAllocAmount("");
      showAlert(t("team_management.wallet.allocation_success"));
      await fetchWalletState();
    } catch (err) {
      showAlert(
        (err as Error).message || t("team_management.wallet.allocation_failed"),
      );
    } finally {
      setAllocating(false);
    }
  };

  if (!subscription && !wallet) return null;

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
        <Wallet className="size-5 shrink-0 text-orange-600" />
        {t("team_management.wallet.title")}
      </h3>

      {wallet?.status === "FROZEN" && (
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

        {wallet && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Coins className="size-4 shrink-0 text-orange-600" />
              {t("team_management.wallet.balance_title")}
            </span>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">
                  {t("team_management.wallet.pool_balance")}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {wallet.unallocatedBalance}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {t("team_management.wallet.my_allocation")}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
                  {wallet.myAllocationBalance}
                </p>
              </div>
            </div>

            {isManager && (
              /**
               * Info: (20260809 - Luphia) 團隊管理不內嵌購買流程（產品決策 20260809）：
               * 引導至 /pricing/credits 購買，購點入池由後端 BILLING_TEAM_POINT 訂單履行
               */
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
            )}
          </div>
        )}
      </div>

      {isManager && wallet && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ArrowRightLeft className="size-4 shrink-0 text-orange-600" />
            {t("team_management.wallet.allocation_title")}
          </span>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={allocTarget}
              onChange={(e) => setAllocTarget(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700"
            >
              <option value="">
                {t("team_management.wallet.select_member")}
              </option>
              {memberOptions.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              inputMode="numeric"
              value={allocAmount}
              onChange={(e) => setAllocAmount(e.target.value)}
              placeholder={t("team_management.wallet.amount_placeholder")}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 sm:w-32"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAllocation(ALLOCATION_DIRECTION.ALLOCATE)}
                disabled={allocating}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("team_management.wallet.allocate")}
              </button>
              <button
                onClick={() => handleAllocation(ALLOCATION_DIRECTION.REVOKE)}
                disabled={allocating}
                className="rounded-lg border border-orange-600 px-3 py-1.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("team_management.wallet.revoke")}
              </button>
            </div>
          </div>

          {wallet.allocations && wallet.allocations.length > 0 ? (
            <div className="mt-4 divide-y divide-gray-100 border-t border-gray-100">
              {wallet.allocations.map((a) => {
                const memberLabel =
                  memberOptions.find((m) => m.userId === a.userId)?.label ??
                  a.userId;
                return (
                  <div
                    key={a.userId}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="truncate text-gray-700">
                      {memberLabel}
                    </span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {a.balance}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
              {t("team_management.wallet.allocations_empty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
