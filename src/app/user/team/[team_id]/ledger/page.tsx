"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, History, Info, RefreshCw, Settings2 } from "lucide-react";

import { useTranslation } from "@/i18n/i18n_context";
import Pagination from "@/components/common/pagination";
import { formatDate } from "@/lib/utils/date";
import {
  BILLABLE_FEATURE_CODE,
  type BillableFeatureCode,
} from "@/constants/subscription_quota";
import {
  TEAM_WALLET_LEDGER_FILTER,
  TEAM_WALLET_LEDGER_FILTER_VALUES,
  TEAM_WALLET_LEDGER_LOAD_STATUS,
  TEAM_WALLET_LEDGER_PAGE_SIZE,
  isShownTransferStatus,
  isSystemAdjustmentEntry,
  type TeamWalletLedgerFilter,
  type TeamWalletLedgerLoadStatus,
} from "@/constants/team_wallet_ledger";
import type { ILedgerEntryView } from "@/interfaces/team_wallet";

/**
 * Info: (20261015 - Luphia) 團隊點數移轉紀錄（流水帳）頁。
 *
 * 資料來源是 `GET /api/v1/user/team/[team_id]/wallet/ledger`，後端限管理職；
 * 一般成員直接開這個網址只會拿到 403，畫面顯示載入失敗——閘在後端，不在這裡。
 * 成員名稱用團隊管理頁同一支 `/members` 解析 userId；已離開的成員查不到，
 * 顯示「已離開的成員」而不是空白或 userId（後者對使用者沒有意義）。
 */

interface ITeamMemberLite {
  userId: string;
  user?: { address: string; name: string | null };
}

interface ITeamLite {
  id: string;
  name: string;
}

interface ILedgerPage {
  items: ILedgerEntryView[];
  total: number;
}

const FEATURE_CODES: readonly string[] = Object.values(BILLABLE_FEATURE_CODE);

function isBillableFeatureCode(code: string): code is BillableFeatureCode {
  return FEATURE_CODES.includes(code);
}

/**
 * Info: (20261015 - Luphia) 有號點數字串的顯示：只做字串處理（千分位、正號），
 * 不轉 number——金額是 BigInt 字串，轉 number 在大額時會失真。
 */
function formatPoints(amount: string): string {
  const negative = amount.startsWith("-");
  const digits = negative ? amount.slice(1) : amount;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return negative ? `−${grouped}` : grouped;
}

function formatSignedPoints(amount: string): {
  text: string;
  sign: -1 | 0 | 1;
} {
  if (/^-?0+$/.test(amount)) return { text: "0", sign: 0 };
  return amount.startsWith("-")
    ? { text: formatPoints(amount), sign: -1 }
    : { text: `+${formatPoints(amount)}`, sign: 1 };
}

export default function TeamLedgerPage() {
  const { t } = useTranslation();
  const params = useParams<{ team_id: string }>();
  const teamId = params?.team_id ?? "";

  const [filter, setFilter] = useState<TeamWalletLedgerFilter>(
    TEAM_WALLET_LEDGER_FILTER.ALL,
  );
  const [page, setPage] = useState(1);
  // Info: (20261015 - Luphia) 預設不列「分配撥入成員」的系統分錄，改在分配列上標示撥入狀態
  const [includeSystem, setIncludeSystem] = useState(false);
  const [ledger, setLedger] = useState<ILedgerPage | null>(null);
  const [status, setStatus] = useState<TeamWalletLedgerLoadStatus>(
    TEAM_WALLET_LEDGER_LOAD_STATUS.LOADING,
  );
  const [members, setMembers] = useState<ITeamMemberLite[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!teamId) return;
    setStatus(TEAM_WALLET_LEDGER_LOAD_STATUS.LOADING);
    try {
      const token = localStorage.getItem("dewt");
      const query = new URLSearchParams({
        page: String(page),
        pageSize: String(TEAM_WALLET_LEDGER_PAGE_SIZE),
        type: filter,
        includeSystem: String(includeSystem),
      });
      const res = await fetch(
        `/api/v1/user/team/${teamId}/wallet/ledger?${query.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "ledger fetch failed");
      setLedger(json.payload as ILedgerPage);
      setStatus(TEAM_WALLET_LEDGER_LOAD_STATUS.READY);
    } catch (err) {
      console.error("Error fetching team ledger:", err);
      setLedger(null);
      setStatus(TEAM_WALLET_LEDGER_LOAD_STATUS.ERROR);
    }
  }, [teamId, page, filter, includeSystem]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Info: (20261015 - Luphia) 成員與團隊名稱只用於顯示，失敗不擋流水帳本身
  useEffect(() => {
    if (!teamId) return;
    const token = localStorage.getItem("dewt");
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`/api/v1/user/team/${teamId}/members`, { headers })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setMembers(json.payload || []);
      })
      .catch((err) => console.error("Error fetching members:", err));
    fetch("/api/v1/user/team", { headers })
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) return;
        const team = (json.payload as ITeamLite[] | undefined)?.find(
          (item) => item.id === teamId,
        );
        setTeamName(team?.name ?? null);
      })
      .catch((err) => console.error("Error fetching teams:", err));
  }, [teamId]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.userId] = m.user?.name || m.user?.address || m.userId;
    });
    return map;
  }, [members]);

  const nameOf = (userId: string) =>
    memberNameById[userId] ?? t("team_management.ledger.former_member");

  const handleFilterChange = (next: TeamWalletLedgerFilter) => {
    setFilter(next);
    setPage(1);
  };

  const totalPages = ledger
    ? Math.max(1, Math.ceil(ledger.total / TEAM_WALLET_LEDGER_PAGE_SIZE))
    : 1;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/user/team"
          className="inline-flex items-center text-sm font-medium text-gray-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="mr-1 size-4 shrink-0" />
          {t("team_management.ledger.back")}
        </Link>

        <div className="flex items-start gap-x-4">
          <div className="rounded-lg bg-orange-50 p-2">
            <History className="size-6 shrink-0 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t("team_management.ledger.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {teamName ? `${teamName} · ` : ""}
              {t("team_management.ledger.description")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Info: (20261015 - Luphia) 類型篩選：伺服器端過濾，換篩選即回第一頁 */}
          <div
            role="group"
            aria-label={t("team_management.ledger.filter_label")}
            className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4"
          >
            {TEAM_WALLET_LEDGER_FILTER_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleFilterChange(value)}
                aria-pressed={filter === value}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  filter === value
                    ? "bg-orange-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-700"
                }`}
              >
                {t(`team_management.ledger.filters.${value}`)}
              </button>
            ))}
            <label
              title={t("team_management.ledger.show_system_hint")}
              className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-500"
            >
              <input
                type="checkbox"
                checked={includeSystem}
                onChange={(e) => {
                  setIncludeSystem(e.target.checked);
                  setPage(1);
                }}
                className="size-3.5 accent-orange-600"
              />
              {t("team_management.ledger.show_system")}
            </label>
            {ledger && status === TEAM_WALLET_LEDGER_LOAD_STATUS.READY && (
              <span className="text-xs text-gray-500">
                {t("team_management.ledger.total", { total: ledger.total })}
              </span>
            )}
          </div>

          {status === TEAM_WALLET_LEDGER_LOAD_STATUS.LOADING && (
            <div className="flex justify-center py-12">
              <div className="size-8 shrink-0 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            </div>
          )}

          {status === TEAM_WALLET_LEDGER_LOAD_STATUS.ERROR && (
            <div className="flex flex-col items-center gap-3 py-12 text-sm text-gray-500">
              <p>{t("team_management.ledger.load_failed")}</p>
              <button
                type="button"
                onClick={fetchLedger}
                className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100"
              >
                <RefreshCw className="mr-2 size-4 shrink-0" />
                {t("team_management.ledger.retry")}
              </button>
            </div>
          )}

          {status === TEAM_WALLET_LEDGER_LOAD_STATUS.READY &&
            ledger &&
            ledger.items.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-500">
                {t("team_management.ledger.empty")}
              </p>
            )}

          {status === TEAM_WALLET_LEDGER_LOAD_STATUS.READY &&
            ledger &&
            ledger.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-medium tracking-wide text-gray-500 uppercase">
                      <th className="px-3 py-2">
                        {t("team_management.ledger.columns.time")}
                      </th>
                      <th className="px-3 py-2">
                        {t("team_management.ledger.columns.type")}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t("team_management.ledger.columns.amount")}
                      </th>
                      <th className="px-3 py-2">
                        {t("team_management.ledger.columns.member")}
                      </th>
                      <th className="px-3 py-2">
                        {t("team_management.ledger.columns.feature")}
                      </th>
                      <th className="px-3 py-2 text-right">
                        {t("team_management.ledger.columns.pool_balance")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.items.map((entry) => {
                      const systemAdjustment = isSystemAdjustmentEntry(entry);
                      const amount = formatSignedPoints(entry.amount);
                      const counterpartId =
                        entry.targetUserId ?? entry.operatorUserId;
                      const showOperator =
                        entry.targetUserId !== null &&
                        entry.operatorUserId !== entry.targetUserId;
                      const featureCode: string | null = entry.featureCode;
                      return (
                        <tr
                          key={entry.id}
                          className={`border-b border-gray-50 last:border-b-0 ${
                            systemAdjustment
                              ? "bg-gray-50/60 text-gray-500"
                              : ""
                          }`}
                        >
                          <td className="px-3 py-3 whitespace-nowrap text-gray-600 tabular-nums">
                            {formatDate(
                              entry.createdAt * 1000,
                              "yyyy-MM-dd HH:mm",
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {systemAdjustment ? (
                              <span
                                title={t(
                                  "team_management.ledger.system_adjustment_hint",
                                )}
                                className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600"
                              >
                                <Settings2 className="size-3 shrink-0" />
                                {t("team_management.ledger.system_adjustment")}
                                <Info className="size-3 shrink-0" />
                              </span>
                            ) : (
                              <span className="rounded bg-orange-50 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                                {t(
                                  `team_management.ledger.types.${entry.entryType}`,
                                )}
                              </span>
                            )}
                            {/* Info: (20261015 - Luphia) 分配列直接說明點數去向，取代原本緊接著的 −N 系統分錄 */}
                            {entry.memberTransferStatus &&
                              isShownTransferStatus(
                                entry.memberTransferStatus,
                              ) && (
                                <div className="mt-1 text-xs text-gray-500">
                                  {t(
                                    `team_management.ledger.transfer.${entry.memberTransferStatus}`,
                                    {
                                      name: nameOf(
                                        entry.targetUserId ??
                                          entry.operatorUserId,
                                      ),
                                    },
                                  )}
                                </div>
                              )}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-medium whitespace-nowrap tabular-nums ${
                              systemAdjustment
                                ? "text-gray-500"
                                : amount.sign > 0
                                  ? "text-green-600"
                                  : amount.sign < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                            }`}
                          >
                            {amount.text}
                          </td>
                          <td className="px-3 py-3">
                            <div className="max-w-[16rem] truncate text-gray-900">
                              {nameOf(counterpartId)}
                            </div>
                            {showOperator && (
                              <div className="max-w-[16rem] truncate text-xs text-gray-500">
                                {t("team_management.ledger.operated_by", {
                                  name: nameOf(entry.operatorUserId),
                                })}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                            {systemAdjustment || featureCode === null
                              ? "—"
                              : isBillableFeatureCode(featureCode)
                                ? t(
                                    `team_management.ledger.features.${featureCode}`,
                                  )
                                : featureCode}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap text-gray-600 tabular-nums">
                            {entry.poolBalanceAfter === null
                              ? "—"
                              : formatPoints(entry.poolBalanceAfter)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
