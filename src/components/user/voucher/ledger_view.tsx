"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Search, Loader2, ChevronDown, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { timestampToString } from "@/lib/utils/common";
import { MoneyUtil } from "@/lib/utils/money";
import { LabelType, BalanceComparator } from "@/constants/ledger";
import { LedgerSorting } from "@/constants/sort";
import { ILedgerItem, ILedgerTotal } from "@/interfaces/ledger";
import { AccountType } from "@/constants/enums";
import { ACCOUNT_TYPE_COLORS } from "@/constants/accounting_account";
import DateRangePicker from "@/components/common/date_range_picker";

// Info: (20260727 - Julian) 點擊分錄開啟傳票詳情（延後載入，避免拖慢分類帳首屏）
const VoucherDetailModal = dynamic(
  () => import("@/components/user/voucher/voucher_detail_modal"),
  { ssr: false },
);

interface ILedgerResponse {
  data: ILedgerItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  note: { currencyAlias: string; total: ILedgerTotal };
}

interface ILedgerViewProps {
  // Info: (20260727 - Julian) 將目前篩選條件上報給父層（供共用匯出 Modal）
  onExportParamsChange: (params: {
    startDate: string;
    endDate: string;
    extraParams: Record<string, string>;
  }) => void;
}

// Info: (20260727 - Julian) 分類帳不分頁，一次取回（後端上限 1000）
const PAGE_SIZE = 1000;
const LABEL_OPTIONS: LabelType[] = [
  LabelType.ALL,
  LabelType.GENERAL,
  LabelType.DETAILED,
];
const SORT_OPTIONS: LedgerSorting[] = [
  LedgerSorting.CODE_ASC,
  LedgerSorting.CODE_DESC,
  LedgerSorting.DATE_ASC,
  LedgerSorting.DATE_DESC,
  LedgerSorting.BALANCE_ASC,
  LedgerSorting.BALANCE_DESC,
];
const BALANCE_OP_OPTIONS: BalanceComparator[] = [
  BalanceComparator.GTE,
  BalanceComparator.LTE,
  BalanceComparator.EQ,
];

// Info: (20260727 - Julian) 金額為 0 顯示破折號，否則加千分位
function formatAmount(value: string): string {
  return MoneyUtil.toDecimal(value).isZero() ? "−" : MoneyUtil.format(value);
}

// Info: (20260728 - Julian) 將 YYYY-MM-DD 轉為當日起訖的 ISO（純函式、無 state 閉包，置於模組層避免每次 render 重建）
function toIso(date: string, endOfDay: boolean): string {
  const [y, m, d] = date.split("-").map(Number);
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
    : new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

export default function LedgerView({ onExportParamsChange }: ILedgerViewProps) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  // Info: (20260727 - Julian) 由試算表 drill-down 帶入的初始篩選（?code=&labelType=）
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  // Info: (20260727 - Julian) 試算表總帳節點 drill-down 帶入的科目類別篩選（deep-link 專用）
  const accountType = searchParams.get("accountType") ?? "";
  // Info: (20260727 - Julian) 試算表統馭科目 drill-down 帶入的科目子樹根代碼（含該科目及所有子孫；deep-link 專用）
  const rootCode = searchParams.get("rootCode") ?? "";
  const initialLabelType = (() => {
    const lt = searchParams.get("labelType");
    return lt === LabelType.GENERAL ||
      lt === LabelType.DETAILED ||
      lt === LabelType.ALL
      ? (lt as LabelType)
      : LabelType.ALL;
  })();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [labelType, setLabelType] = useState<LabelType>(initialLabelType);
  const [keyword, setKeyword] = useState<string>(initialCode);
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>(initialCode);
  const [balanceOp, setBalanceOp] = useState<BalanceComparator>(
    BalanceComparator.GTE,
  );
  const [balanceValue, setBalanceValue] = useState<string>("");
  const [debouncedBalanceValue, setDebouncedBalanceValue] =
    useState<string>("");
  const [sorting, setSorting] = useState<LedgerSorting>(LedgerSorting.CODE_ASC);

  const [items, setItems] = useState<ILedgerItem[]>([]);
  const [total, setTotal] = useState<ILedgerTotal | null>(null);
  const [currencyAlias, setCurrencyAlias] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Info: (20260727 - Julian) 已折疊的科目群組（存放 code）
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Info: (20260727 - Julian) 目前開啟的傳票詳情（drill-down 至 VoucherDetailModal）
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );

  // Info: (20260727 - Julian) 關鍵字 debounce，避免逐字打字即打 API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Info: (20260727 - Julian) 餘額金額 debounce
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedBalanceValue(balanceValue.trim()),
      400,
    );
    return () => clearTimeout(timer);
  }, [balanceValue]);

  // Info: (20260727 - Julian) 將目前條件上報父層供匯出
  useEffect(() => {
    onExportParamsChange({
      startDate,
      endDate,
      extraParams: {
        labelType,
        sorting,
        keyword: debouncedKeyword,
        accountType,
        rootCode,
        balanceOp,
        balanceValue: debouncedBalanceValue,
      },
    });
  }, [
    onExportParamsChange,
    startDate,
    endDate,
    labelType,
    sorting,
    debouncedKeyword,
    accountType,
    rootCode,
    balanceOp,
    debouncedBalanceValue,
  ]);

  const fetchLedger = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const res = await request<IApiResponse<ILedgerResponse>>(
        `/api/v1/user/account_book/${accountBookId}/ledger`,
        {
          query: {
            // Info: (20260727 - Julian) 日期為可選；未選則不帶，後端回傳全部（比照傳票管理）
            startDate: startDate ? toIso(startDate, false) : undefined,
            endDate: endDate ? toIso(endDate, true) : undefined,
            labelType,
            sorting,
            keyword: debouncedKeyword || undefined,
            accountType: accountType || undefined,
            rootCode: rootCode || undefined,
            balanceOp,
            balanceValue: debouncedBalanceValue || undefined,
            pageSize: PAGE_SIZE,
          },
        },
      );
      if (res.payload) {
        setItems(res.payload.data);
        setTotal(res.payload.note.total);
        setCurrencyAlias(res.payload.note.currencyAlias);
      }
    } catch (error) {
      console.error("Failed to fetch ledger:", error);
      setItems([]);
      setTotal(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    accountBookId,
    startDate,
    endDate,
    labelType,
    sorting,
    debouncedKeyword,
    accountType,
    rootCode,
    balanceOp,
    debouncedBalanceValue,
  ]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Info: (20260727 - Julian) 折疊 / 展開科目群組
  const toggleCollapse = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Info: (20260727 - Julian) 依科目分組相鄰列，供群組標題呈現
  const groups = useMemo(() => {
    const result: {
      code: string;
      title: string;
      type: AccountType | null;
      rows: ILedgerItem[];
    }[] = [];
    items.forEach((item) => {
      const last = result[result.length - 1];
      if (last && last.code === item.code) {
        last.rows.push(item);
      } else {
        result.push({
          code: item.code,
          title: item.accountingTitle,
          type: item.accountType,
          rows: [item],
        });
      }
    });
    return result;
  }, [items]);

  return (
    <div className="flex flex-col gap-4">
      {/* Info: (20260727 - Julian) 篩選列 */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t("voucher.ledger.filters.keyword")}
          </span>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <Search className="size-4 shrink-0 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t("voucher.ledger.filters.keyword_placeholder")}
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t("voucher.ledger.filters.date")}
          </span>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            className="flex items-center gap-2 text-slate-400"
          />
        </div>

        {/* Info: (20260727 - Julian) 餘額金額區間（運算子 + 數值） */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t("voucher.ledger.filters.balance")}
          </span>
          <div className="flex items-end gap-2">
            <input
              type="number"
              value={balanceValue}
              onChange={(e) => setBalanceValue(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()} // Info: (20260727 - Julian) 封鎖滾輪事件
              placeholder={t("voucher.ledger.filters.balance_placeholder")}
              className="w-32 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
            <div className="flex rounded-lg bg-slate-100 text-[10px]">
              {BALANCE_OP_OPTIONS.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => setBalanceOp(op)}
                  className={`rounded-sm px-1 py-0.5 whitespace-nowrap transition-colors ${
                    balanceOp === op
                      ? "bg-orange-50 font-bold text-orange-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t(`voucher.ledger.balance_op.${op}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t("voucher.ledger.filters.sort")}
          </span>
          <select
            value={sorting}
            onChange={(e) => setSorting(e.target.value as LedgerSorting)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`voucher.ledger.sort.${option}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info: (20260727 - Julian) 帳別篩選 與 借貸總額 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Info: (20260727 - Julian) 帳別 */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            {t("voucher.ledger.filters.label")}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            {LABEL_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLabelType(option)}
                className={`px-4 py-2.5 transition-colors ${
                  labelType === option
                    ? "bg-orange-50 font-bold text-orange-700"
                    : "text-slate-600 hover:text-orange-500"
                }`}
              >
                {t(`voucher.ledger.label_type.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Info: (20260727 - Julian) 借貸總額 */}
        {total && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">
                {t("voucher.ledger.summary.currency")}
              </div>
              <div className="text-lg font-bold text-slate-800">
                {currencyAlias}
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">
                {t("voucher.ledger.summary.total_debit")}
              </div>
              <div className="text-lg font-bold text-slate-800">
                {MoneyUtil.format(total.totalDebit)}
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
              <div className="text-xs text-slate-500">
                {t("voucher.ledger.summary.total_credit")}
              </div>
              <div className="text-lg font-bold text-slate-800">
                {MoneyUtil.format(total.totalCredit)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info: (20260727 - Julian) 明細表 / 狀態（未選日期則顯示全部） */}
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-orange-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">
          {t("voucher.ledger.empty.no_data")}
        </div>
      ) : (
        // Info: (20260727 - Julian) 每個科目分錄為獨立可折疊區塊
        <div className="flex flex-col gap-3">
          {groups.map((group) => {
            const isCollapsed = collapsed.has(group.code);
            // Info: (20260727 - Julian) 依科目類別著色（比照會計科目管理）
            const colors =
              ACCOUNT_TYPE_COLORS[group.type ?? ""] ||
              ACCOUNT_TYPE_COLORS.other;
            return (
              <div
                key={group.code}
                className={`overflow-hidden rounded-xl border ${colors.border}`}
              >
                {/* Info: (20260727 - Julian) 分錄標題（加大、可折疊、依類別著色） */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(group.code)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:cursor-pointer ${colors.bg} ${colors.text}`}
                >
                  <ChevronDown
                    size={20}
                    className={`shrink-0 transition-transform duration-300 ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                  />
                  <span
                    className={`rounded border ${colors.border} bg-white/70 px-2 py-1 text-sm font-semibold`}
                  >
                    {group.code}
                  </span>
                  <span className="text-lg font-bold">{group.title}</span>
                </button>

                {/* Info: (20260727 - Julian) 折疊過渡動畫（grid-rows 0fr↔1fr） */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div
                      className={`overflow-x-auto border-t ${colors.border}`}
                    >
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-200 text-xs font-normal text-slate-500">
                            <th className="px-3 py-1 text-left">
                              {t("voucher.ledger.headers.voucher_no")}
                            </th>
                            <th className="px-3 py-1 text-left">
                              {t("voucher.ledger.headers.date")}
                            </th>
                            <th className="px-3 py-1 text-left">
                              {t("voucher.ledger.headers.type")}
                            </th>
                            <th className="px-3 py-1 text-left">
                              {t("voucher.ledger.headers.particulars")}
                            </th>
                            <th className="px-3 py-1 text-center">
                              {t("voucher.ledger.headers.debit")}
                            </th>
                            <th className="px-3 py-1 text-center">
                              {t("voucher.ledger.headers.credit")}
                            </th>
                            <th className="px-3 py-1 text-center">
                              {t("voucher.ledger.headers.balance")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row, idx) => (
                            <tr
                              key={`${group.code}-${idx}`}
                              // Info: (20260727 - Julian) 點擊該列開啟傳票詳情，供會計師查核
                              onClick={() =>
                                setSelectedVoucherId(row.voucherId)
                              }
                              title={t("voucher.ledger.view_detail")}
                              className="cursor-pointer border-t border-slate-100 text-sm transition-colors first:border-t-0 hover:bg-orange-50/60"
                            >
                              <td className="px-3 py-2 text-xs text-slate-500">
                                {row.voucherNumber}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-slate-800">
                                {
                                  timestampToString(row.voucherDate)
                                    .dateWithDash
                                }
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.voucherType ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {row.particulars}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-700">
                                {formatAmount(row.debitAmount)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-700">
                                {formatAmount(row.creditAmount)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-800">
                                {MoneyUtil.format(row.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info: (20260727 - Julian) 傳票詳情彈窗；背景遮罩 + 置中，更新後重抓分類帳以反映餘額變動 */}
      <Transition show={!!selectedVoucherId} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-200"
          onClose={() => setSelectedVoucherId(null)}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-201 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                {/* Info: (20260727 - Julian) VoucherContent 為 h-full，容器需給定固定高度才能內部捲動 */}
                <DialogPanel className="relative flex h-[85vh] max-h-[90vh] w-full max-w-4xl transform flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                  <div className="flex items-center justify-end px-3 py-1">
                    <button
                      type="button"
                      onClick={() => setSelectedVoucherId(null)}
                      className="shrink-0 p-2 text-slate-500 hover:text-slate-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {selectedVoucherId && (
                    <VoucherDetailModal
                      isOpen={true}
                      onClose={() => setSelectedVoucherId(null)}
                      voucherId={selectedVoucherId}
                      onUpdate={() => {
                        setSelectedVoucherId(null);
                        fetchLedger();
                      }}
                    />
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
