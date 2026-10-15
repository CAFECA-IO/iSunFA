"use client";

import { useCallback, useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { IUserTarget } from "@/components/admin/user/point_issue_modal";
import { POINT_LEDGER_ENTRY_TYPE } from "@/constants/point_ledger";
import {
  ADMIN_USER_POINTS_PAGE_SIZE,
  ADMIN_USER_POINTS_TAB,
  AdminUserPointsTab,
  TEAM_ALLOCATION_RECORD_STATUS,
  TeamAllocationRecordStatus,
} from "@/constants/admin_user_points";
import type {
  IAdminListPage,
  IAdminTeamAllocationRecordView,
  IAdminUserPointsView,
} from "@/interfaces/admin_user_points";

interface IUserPointsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: IUserTarget | null;
}

interface IEnvelope<T> {
  success: boolean;
  message?: string;
  payload: T | null;
}

// Info: (20261015 - Luphia) 字面鍵寫在這裡，i18n 掃描看得到；未知型別退回原始值
const ENTRY_TYPE_LABEL_KEY: Record<string, string> = {
  [POINT_LEDGER_ENTRY_TYPE.PURCHASE]:
    "admin_member.modal_points.entry_type.PURCHASE",
  [POINT_LEDGER_ENTRY_TYPE.ADMIN_ISSUED]:
    "admin_member.modal_points.entry_type.ADMIN_ISSUED",
  [POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD]:
    "admin_member.modal_points.entry_type.REGISTRATION_REWARD",
  [POINT_LEDGER_ENTRY_TYPE.CHECK_IN_REWARD]:
    "admin_member.modal_points.entry_type.CHECK_IN_REWARD",
  [POINT_LEDGER_ENTRY_TYPE.CAMPAIGN_BONUS]:
    "admin_member.modal_points.entry_type.CAMPAIGN_BONUS",
  [POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION]:
    "admin_member.modal_points.entry_type.TEAM_ALLOCATION",
  [POINT_LEDGER_ENTRY_TYPE.CONSUME]:
    "admin_member.modal_points.entry_type.CONSUME",
  [POINT_LEDGER_ENTRY_TYPE.REFUND]:
    "admin_member.modal_points.entry_type.REFUND",
  [POINT_LEDGER_ENTRY_TYPE.ADJUST]:
    "admin_member.modal_points.entry_type.ADJUST",
};

const STATUS_STYLE: Record<
  TeamAllocationRecordStatus,
  { labelKey: string; className: string }
> = {
  [TEAM_ALLOCATION_RECORD_STATUS.CREDITED]: {
    labelKey: "admin_member.modal_points.status.CREDITED",
    className: "bg-green-50 text-green-700",
  },
  [TEAM_ALLOCATION_RECORD_STATUS.MIGRATION]: {
    labelKey: "admin_member.modal_points.status.MIGRATION",
    className: "bg-blue-50 text-blue-700",
  },
  [TEAM_ALLOCATION_RECORD_STATUS.COMPENSATED]: {
    labelKey: "admin_member.modal_points.status.COMPENSATED",
    className: "bg-red-50 text-red-700",
  },
  [TEAM_ALLOCATION_RECORD_STATUS.PRE_MIGRATION]: {
    labelKey: "admin_member.modal_points.status.PRE_MIGRATION",
    className: "bg-amber-50 text-amber-700",
  },
  [TEAM_ALLOCATION_RECORD_STATUS.OTHER]: {
    labelKey: "admin_member.modal_points.status.OTHER",
    className: "bg-gray-100 text-gray-600",
  },
};

const TABS: { id: AdminUserPointsTab; labelKey: string }[] = [
  {
    id: ADMIN_USER_POINTS_TAB.OVERVIEW,
    labelKey: "admin_member.modal_points.tab_overview",
  },
  {
    id: ADMIN_USER_POINTS_TAB.LEDGER,
    labelKey: "admin_member.modal_points.tab_ledger",
  },
  {
    id: ADMIN_USER_POINTS_TAB.TEAM,
    labelKey: "admin_member.modal_points.tab_team",
  },
];

// Info: (20261015 - Luphia) 僅格式化顯示（千分位），不做任何加減；金額由服務端以 BigInt 算好
function formatPoints(value: string): string {
  try {
    return BigInt(value).toLocaleString();
  } catch {
    return value;
  }
}

function amountClass(value: string): string {
  return value.startsWith("-") ? "text-red-600" : "text-green-700";
}

function Pager({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-gray-500">
      <span>
        {t("admin_member.modal_points.page_info", {
          page,
          pages: totalPages,
          total,
        })}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={t("admin_member.modal_points.prev_page")}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-gray-200 p-1.5 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={t("admin_member.modal_points.next_page")}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-gray-200 p-1.5 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function UserPointsDetailModal({
  isOpen,
  onClose,
  targetUser,
}: IUserPointsDetailModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminUserPointsTab>(
    ADMIN_USER_POINTS_TAB.OVERVIEW,
  );
  const [ledgerPage, setLedgerPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [points, setPoints] = useState<IAdminUserPointsView | null>(null);
  const [teamRecords, setTeamRecords] =
    useState<IAdminListPage<IAdminTeamAllocationRecordView> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = targetUser?.id ?? null;

  const loadPoints = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await request<IEnvelope<IAdminUserPointsView>>(
        `/api/v1/admin/user/${userId}/points`,
        {
          query: {
            page: ledgerPage,
            pageSize: ADMIN_USER_POINTS_PAGE_SIZE.DEFAULT,
          },
        },
      );
      if (res.success && res.payload) setPoints(res.payload);
      else setError(res.message || t("admin_member.modal_points.load_failed"));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t("admin_member.modal_points.load_failed"),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, ledgerPage, t]);

  const loadTeamRecords = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await request<
        IEnvelope<IAdminListPage<IAdminTeamAllocationRecordView>>
      >(`/api/v1/admin/user/${userId}/team_allocations`, {
        query: {
          page: teamPage,
          pageSize: ADMIN_USER_POINTS_PAGE_SIZE.DEFAULT,
        },
      });
      if (res.success && res.payload) setTeamRecords(res.payload);
      else setError(res.message || t("admin_member.modal_points.load_failed"));
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t("admin_member.modal_points.load_failed"),
      );
    } finally {
      setLoading(false);
    }
  }, [userId, teamPage, t]);

  /**
   * Info: (20261015 - Luphia) 總覽與帳本共用 /points（帳本分頁變動才重抓）；
   * 團隊分配紀錄只在切到該分頁時才抓。狀態不在這裡重置：呼叫端以 key 重新掛載，
   * 換人或重開一律從第一頁與總覽開始。
   */
  useEffect(() => {
    if (isOpen) loadPoints();
  }, [isOpen, loadPoints]);

  useEffect(() => {
    if (isOpen && tab === ADMIN_USER_POINTS_TAB.TEAM) loadTeamRecords();
  }, [isOpen, tab, loadTeamRecords]);

  if (!isOpen || !targetUser) return null;

  const entryTypeLabel = (entryType: string) => {
    const key = ENTRY_TYPE_LABEL_KEY[entryType];
    return key ? t(key) : entryType;
  };

  const renderOverview = () => {
    if (!points) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs text-gray-500">
              {t("admin_member.modal_points.balance")}
            </div>
            <div className="mt-1 text-xl font-bold text-gray-800">
              {formatPoints(points.balance)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs text-gray-500">
              {t("admin_member.modal_points.ledger_total")}
            </div>
            <div className="mt-1 text-xl font-bold text-gray-800">
              {formatPoints(points.ledgerTotal)}
            </div>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
            <div className="text-xs text-orange-700">
              {t("admin_member.modal_points.team_allocated_total")}
            </div>
            <div className="mt-1 text-xl font-bold text-orange-700">
              {formatPoints(points.teamAllocated.total)}
            </div>
          </div>
        </div>

        {points.balanceMismatch && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t("admin_member.modal_points.mismatch_warning")}</p>
          </div>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t("admin_member.modal_points.breakdown_title")}
          </h3>
          {points.breakdown.length === 0 ? (
            <p className="text-sm text-gray-400">
              {t("admin_member.modal_points.no_entries")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-1.5">
                    {t("admin_member.modal_points.th_type")}
                  </th>
                  <th className="py-1.5 text-right">
                    {t("admin_member.modal_points.th_count")}
                  </th>
                  <th className="py-1.5 text-right">
                    {t("admin_member.modal_points.th_total")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {points.breakdown.map((item) => (
                  <tr key={item.entryType}>
                    <td className="py-1.5 text-gray-700">
                      {entryTypeLabel(item.entryType)}
                    </td>
                    <td className="py-1.5 text-right text-gray-500">
                      {item.count.toLocaleString()}
                    </td>
                    <td
                      className={`py-1.5 text-right font-semibold ${amountClass(item.total)}`}
                    >
                      {formatPoints(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            {t("admin_member.modal_points.team_allocated_title")}
          </h3>
          {points.teamAllocated.teams.length === 0 ? (
            <p className="text-sm text-gray-400">
              {t("admin_member.modal_points.no_team_allocation")}
            </p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {points.teamAllocated.teams.map((team) => (
                  <tr key={team.teamId}>
                    <td className="py-1.5 text-gray-700">
                      {team.teamName || team.teamId}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-gray-800">
                      {formatPoints(team.total)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="py-1.5 font-semibold text-gray-700">
                    {t("admin_member.modal_points.team_allocated_total")}
                  </td>
                  <td className="py-1.5 text-right font-bold text-orange-700">
                    {formatPoints(points.teamAllocated.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </section>
      </div>
    );
  };

  const renderLedger = () => {
    if (!points) return null;
    const { ledger } = points;
    if (ledger.items.length === 0) {
      return (
        <p className="text-sm text-gray-400">
          {t("admin_member.modal_points.no_entries")}
        </p>
      );
    }
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_time")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_type")}
                </th>
                <th className="py-1.5 pr-3 text-right">
                  {t("admin_member.modal_points.th_amount")}
                </th>
                <th className="py-1.5 pr-3 text-right">
                  {t("admin_member.modal_points.th_balance_after")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_order_id")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_source_ref")}
                </th>
                <th className="py-1.5">
                  {t("admin_member.modal_points.th_note")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.items.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">
                    {entryTypeLabel(entry.entryType)}
                  </td>
                  <td
                    className={`py-1.5 pr-3 text-right font-semibold whitespace-nowrap ${amountClass(entry.amount)}`}
                  >
                    {formatPoints(entry.amount)}
                  </td>
                  <td className="py-1.5 pr-3 text-right whitespace-nowrap text-gray-600">
                    {formatPoints(entry.balanceAfter)}
                  </td>
                  <td className="max-w-[140px] truncate py-1.5 pr-3 font-mono text-xs text-gray-500">
                    {entry.orderId ?? "-"}
                  </td>
                  <td className="max-w-[140px] truncate py-1.5 pr-3 font-mono text-xs text-gray-500">
                    {entry.sourceRef ?? "-"}
                  </td>
                  <td className="max-w-[200px] py-1.5 text-xs break-words text-gray-500">
                    {entry.note ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          page={ledger.page}
          totalPages={ledger.totalPages}
          total={ledger.total}
          onChange={setLedgerPage}
        />
      </div>
    );
  };

  const renderTeam = () => {
    if (!teamRecords) return null;
    if (teamRecords.items.length === 0) {
      return (
        <p className="text-sm text-gray-400">
          {t("admin_member.modal_points.no_entries")}
        </p>
      );
    }
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_time")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_team")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_type")}
                </th>
                <th className="py-1.5 pr-3 text-right">
                  {t("admin_member.modal_points.th_amount")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_operator")}
                </th>
                <th className="py-1.5 pr-3">
                  {t("admin_member.modal_points.th_status")}
                </th>
                <th className="py-1.5">
                  {t("admin_member.modal_points.th_idempotency_key")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teamRecords.items.map((row) => {
                const style = STATUS_STYLE[row.status];
                return (
                  <tr key={row.id} className="align-top">
                    <td className="py-1.5 pr-3 whitespace-nowrap text-gray-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="max-w-[160px] truncate py-1.5 pr-3 text-gray-700">
                      {row.teamName || row.teamId}
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-gray-600">
                      {row.entryType}
                    </td>
                    <td
                      className={`py-1.5 pr-3 text-right font-semibold whitespace-nowrap ${amountClass(row.amount)}`}
                    >
                      {formatPoints(row.amount)}
                    </td>
                    <td className="max-w-[160px] py-1.5 pr-3">
                      <div className="truncate text-gray-700">
                        {row.operatorName ?? "-"}
                      </div>
                      <div className="truncate font-mono text-xs text-gray-400">
                        {row.operatorAddress ?? row.operatorUserId}
                      </div>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.className}`}
                      >
                        {t(style.labelKey)}
                      </span>
                    </td>
                    <td className="max-w-[180px] truncate py-1.5 font-mono text-xs text-gray-400">
                      {row.idempotencyKey}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager
          page={teamRecords.page}
          totalPages={teamRecords.totalPages}
          total={teamRecords.total}
          onChange={setTeamPage}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in-95 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <ReceiptText className="h-6 w-6 text-orange-500" />
              {t("admin_member.modal_points.title")}
            </h2>
            <div className="mt-1 truncate text-sm text-gray-500">
              {targetUser.name || t("admin_member.page.unnamed_user")}
              <span className="ml-2 font-mono text-xs text-gray-400">
                {targetUser.address}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin_member.modal_points.close")}
            className="text-gray-400 transition hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-100 px-6">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === item.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : tab === ADMIN_USER_POINTS_TAB.OVERVIEW ? (
            renderOverview()
          ) : tab === ADMIN_USER_POINTS_TAB.LEDGER ? (
            renderLedger()
          ) : (
            renderTeam()
          )}
        </div>
      </div>
    </div>
  );
}
