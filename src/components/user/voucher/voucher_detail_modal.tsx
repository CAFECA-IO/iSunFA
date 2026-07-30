"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

import {
  X,
  Hash,
  Plus,
  ChevronDown,
  Trash2,
  Scale,
  Save,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IVoucher, TradingType, IVoucherLineUI } from "@/interfaces/voucher";
import { MoneyUtil } from "@/lib/utils/money";
import ConfirmModal from "@/components/common/confirm_modal";
import AiConfidence from "@/components/common/ai_confidence";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { useParams } from "next/navigation";
import AccountBookSelector from "@/components/user/voucher/account_book_selector";
import FilePreviewModal from "@/components/common/file_preview_modal";

interface IVoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId: string;
  onUpdate?: (voucher: IVoucher) => void;
  // Info: (20260721 - Tzuhan) 帳本 id 可由 prop 注入(碳盤查頁等非 account_book 路徑;未提供時沿用 URL)
  accountBookId?: string | null;
}

// Info: (20260327 - Luphia) 若資料量大，可以使用 memo 包裝避免不必要的重新渲染
const VoucherRow = ({
  row,
  updateRow,
  removeRow,
  onOpenSelector,
}: {
  row: IVoucherLineUI;
  updateRow: (id: string, newRow: IVoucherLineUI) => void;
  removeRow: (id: string) => void;
  onOpenSelector: (rowId: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 shadow-sm sm:contents sm:rounded-none sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none">
      <div className="max-sm:contents sm:col-span-4 sm:flex sm:flex-col sm:gap-2">
        <div className="flex items-center gap-2">
          {/* Info: (20260602 - Julian) Mobile account code name */}
          <div className="order-1 flex flex-1 flex-col gap-1 sm:order-0 sm:block">
            <span className="text-[10px] font-bold text-slate-500 sm:hidden">
              {t("voucher.detail_modal.fields.account_code_name")}
            </span>
            <div className="relative flex h-[36px] items-center overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 lg:h-[42px]">
              <button
                type="button"
                className="w-full flex-1 appearance-none truncate bg-transparent px-2 text-left text-[10px] font-semibold text-slate-700 outline-none lg:px-4 lg:text-sm"
                onClick={() => onOpenSelector(row.id)}
              >
                {row.accounting
                  ? `${row.accounting.code} - ${row.accounting.name}`
                  : t("voucher.detail_modal.fields.accounting_select")}
              </button>
              <div className="pointer-events-none bg-white pr-3">
                <ChevronDown size={16} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Info: (20260602 - Julian) Mobile delete button */}
          <div className="order-2 flex items-center justify-between sm:hidden">
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="rounded-full bg-red-200 p-2.5 text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="order-4 flex flex-col gap-1 sm:order-0 sm:block">
          <span className="text-[10px] font-bold text-slate-500 sm:hidden">
            {t("voucher.detail_modal.fields.particular")}
          </span>
          <div className="h-[36px] lg:h-[42px]">
            <input
              type="text"
              aria-label={t("voucher.detail_modal.fields.particular")}
              value={row.particular}
              placeholder={t("voucher.detail_modal.fields.particular")}
              onChange={(e) =>
                updateRow(row.id, { ...row, particular: e.target.value })
              }
              className="h-full w-full rounded-xl border border-slate-300 bg-white px-2 text-[10px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:px-4 lg:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="order-3 flex gap-2 sm:contents">
        <div className="flex flex-1 flex-col gap-1 sm:col-span-3 sm:block">
          <span className="text-[10px] font-bold text-slate-500 sm:hidden">
            {t("voucher.detail_modal.fields.debit")}
          </span>
          <div className="h-[36px] lg:h-[42px]">
            <input
              type="number"
              aria-label={t("voucher.detail_modal.fields.debit")}
              placeholder="0"
              value={
                row.isDebit === true
                  ? row.amount !== 0 && row.amount !== "0" && row.amount !== 0n
                    ? row.amount.toString()
                    : ""
                  : ""
              }
              disabled={row.isDebit === false}
              min={0}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value;
                updateRow(row.id, {
                  ...row,
                  isDebit: val === "" ? null : true,
                  amount: val === "" ? "0" : val,
                });
              }}
              className="h-full w-full appearance-none rounded-xl border border-slate-300 bg-white px-2 text-right text-[10px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 lg:px-4 lg:text-sm"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 sm:col-span-3 sm:block">
          <span className="text-[10px] font-bold text-slate-500 sm:hidden">
            {t("voucher.detail_modal.fields.credit")}
          </span>
          <div className="h-[36px] lg:h-[42px]">
            <input
              type="number"
              aria-label={t("voucher.detail_modal.fields.credit")}
              placeholder="0"
              value={
                row.isDebit === false
                  ? row.amount !== 0 && row.amount !== "0" && row.amount !== 0n
                    ? row.amount.toString()
                    : ""
                  : ""
              }
              disabled={row.isDebit === true}
              min={0}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => {
                const val = e.target.value;
                updateRow(row.id, {
                  ...row,
                  isDebit: val === "" ? null : false,
                  amount: val === "" ? "0" : val,
                });
              }}
              className="h-full w-full appearance-none rounded-xl border border-slate-300 bg-white px-2 text-right text-[10px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 lg:px-4 lg:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="hidden h-[36px] items-center justify-center p-2 sm:col-span-1 sm:flex lg:h-[42px]">
        <button
          type="button"
          aria-label="Delete row"
          onClick={() => removeRow(row.id)}
          className="text-slate-300 transition-colors hover:text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default function VoucherDetailModal({
  isOpen,
  onClose,
  voucherId,
  accountBookId: accountBookIdProp = undefined,
}: IVoucherDetailModalProps) {
  const { t } = useTranslation();
  const params = useParams();
  // Info: (20260721 - Tzuhan) prop 優先:carbon_chatbot 頁不在 account_book 路徑下,URL 取不到
  const accountBookId =
    accountBookIdProp ?? (params?.account_book_id as string);

  const [activeVoucher, setActiveVoucher] = useState<IVoucher | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [inputDate, setInputDate] = useState<number>(0);
  const [voucherType, setVoucherType] = useState<TradingType | null>(null);
  const [note, setNote] = useState<string>("");
  const [editedVoucherId, setEditedVoucherId] = useState<string>("");
  const [rows, setRows] = useState<IVoucherLineUI[]>([]);

  // Info: (20260327 - Luphia) Modals state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isUnverifyModalOpen, setIsUnverifyModalOpen] = useState(false);
  const [targetVerify, setTargetVerify] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isAccountBookSelectorOpen, setIsAccountBookSelectorOpen] =
    useState(false);
  const [selectorTargetRowId, setSelectorTargetRowId] = useState<string | null>(
    null,
  );

  // Info: (20260327 - Luphia) 處理 Fetch，並加入 abort/ignore 避免競態條件
  useEffect(() => {
    let isMounted = true;
    if (isOpen && voucherId && accountBookId) {
      const fetchVoucher = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<IVoucher>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`,
          );
          if (res.payload && isMounted) {
            const v = res.payload;
            setActiveVoucher(v);
            setInputDate(v.tradingDate * 1000);
            setVoucherType(v.tradingType);
            setNote(v.note || "");
            setEditedVoucherId(v.id);
            setRows(v.lineItems.lines || []);
          }
        } catch (error) {
          console.error("Failed to fetch voucher details:", error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      fetchVoucher();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, voucherId, accountBookId]);

  // Info: (20260327 - Luphia) 使用 useMemo 計算金額，避免每次打字都重新計算
  const { totalCredit, totalDebit, isTotalBalanced } = useMemo(() => {
    let credit = MoneyUtil.toDecimal(0);
    let debit = MoneyUtil.toDecimal(0);
    rows.forEach((row) => {
      if (row.isDebit === false)
        credit = credit.plus(MoneyUtil.toDecimal(row.amount));
      if (row.isDebit === true)
        debit = debit.plus(MoneyUtil.toDecimal(row.amount));
    });
    return {
      totalCredit: credit.toString(),
      totalDebit: debit.toString(),
      isTotalBalanced: credit.gt(0) && debit.gt(0) && credit.equals(debit), // Info: (20260327 - Luphia) 確保不全是 0
    };
  }, [rows]);

  const disabledSaveButton = useMemo(() => {
    return (
      !editedVoucherId.trim() ||
      inputDate === 0 ||
      voucherType == null ||
      !isTotalBalanced ||
      rows.length === 0 ||
      rows.some(
        (row) =>
          row.accounting === null || MoneyUtil.toDecimal(row.amount).isZero(),
      )
    );
  }, [editedVoucherId, inputDate, voucherType, isTotalBalanced, rows]);

  // Info: (20260327 - Luphia) 使用 useCallback 搭配 Functional Update，避免不必要的重新渲染
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        accountingCode: "",
        accounting: null,
        particular: "",
        amount: "0",
        isDebit: null,
      },
    ]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRow = useCallback((id: string, newRow: IVoucherLineUI) => {
    setRows((prev) => prev.map((r) => (r.id === id ? newRow : r)));
  }, []);

  const checkHasChanges = useCallback(() => {
    if (!activeVoucher) return true;
    if (inputDate / 1000 !== (activeVoucher.tradingDate ?? 0)) return true;
    if (voucherType !== (activeVoucher.tradingType ?? TradingType.INCOME))
      return true;
    if (note !== (activeVoucher.note || "")) return true;
    if (editedVoucherId !== activeVoucher.id) return true;

    const originalRows = activeVoucher.lineItems.lines || [];
    if (rows.length !== originalRows.length) return true;
    return rows.some((row, i) => {
      const orig = originalRows[i];
      return (
        row.accounting?.code !== orig.accounting?.code ||
        row.particular !== orig.particular ||
        row.amount !== orig.amount ||
        row.isDebit !== orig.isDebit
      );
    });
  }, [activeVoucher, inputDate, voucherType, note, editedVoucherId, rows]);

  const handleCancelEdit = () => {
    if (activeVoucher) {
      setInputDate(activeVoucher.tradingDate * 1000);
      setVoucherType(activeVoucher.tradingType);
      setNote(activeVoucher.note || "");
      setEditedVoucherId(activeVoucher.id);
      setRows(activeVoucher.lineItems.lines || []);
    }
    setIsCancelModalOpen(false);
  };

  const saveVoucher = (isVerified?: boolean) => {
    setTargetVerify(!!isVerified);
    setIsSaveModalOpen(true);
  };

  const executeSaveVoucher = async (overrideVerify: boolean | null = null) => {
    setIsSaving(true);
    const finalVerify = overrideVerify !== null ? overrideVerify : targetVerify;
    try {
      const payload = {
        id: editedVoucherId,
        inputDate,
        voucherType,
        note,
        rows,
        isVerified: finalVerify,
      };
      const res = await request<IApiResponse<IVoucher>>(
        `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`,
        { method: "PUT", body: JSON.stringify(payload) },
      );
      if (res.code === ApiCode.SUCCESS || res.payload) {
        setIsSaveModalOpen(false);
        onClose();
      }
    } catch (error) {
      console.error("Save voucher error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnverifyConfirmed = () => {
    setIsUnverifyModalOpen(false);
    setTargetVerify(false);
    executeSaveVoucher(false);
  };

  if (voucherId && (!activeVoucher || isLoading)) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-10 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!activeVoucher || activeVoucher?.isDeleted) return null;

  const voucherLineItems =
    rows.length > 0 ? (
      rows.map((row) => (
        <VoucherRow
          key={row.id}
          row={row}
          updateRow={updateRow}
          removeRow={removeRow}
          onOpenSelector={(rowId) => {
            setSelectorTargetRowId(rowId);
            setIsAccountBookSelectorOpen(true);
          }}
        />
      ))
    ) : (
      <div className="col-span-11 flex items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50/50 p-4 text-sm text-red-500">
        {t("voucher.detail_modal.messages.no_entries_hint")}
      </div>
    );

  const VoucherContent = (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Info: (20260327 - Luphia) Body Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[10px]">
        {/* Info: (20260327 - Luphia) Section 1: Basic Info */}
        <div className="flex shrink-0 flex-col items-start justify-between gap-2 p-4 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h4 className="text-base font-bold text-slate-500">
              {t("verify.type.voucher")}
            </h4>
            {activeVoucher.isVerified ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                {t("verify.status.verified")}
              </span>
            ) : (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                {t("verify.status.unverified")}
              </span>
            )}
          </div>
          <div className="relative mr-auto ml-auto md:mr-0">
            <AiConfidence
              confidence={activeVoucher.confidence}
              note={activeVoucher.aiNote}
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 px-4 pt-2 sm:px-6 sm:pt-4 lg:mb-8 lg:gap-4">
          <div>
            <label
              htmlFor="voucher-date"
              className="mb-2 block text-xs font-bold text-slate-600"
            >
              {t("voucher.detail_modal.fields.voucher_date")}
            </label>
            <input
              id="voucher-date"
              aria-label="voucher.detail_modal.fields.voucher_date"
              type="date"
              value={new Date(inputDate).toISOString().split("T")[0]}
              onChange={(e) =>
                setInputDate(
                  isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:py-2.5 lg:text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">
              {t("voucher.detail_modal.fields.voucher_type")}
            </label>
            <div className="relative">
              <select
                value={(voucherType as TradingType) ?? ""}
                onChange={(e) => setVoucherType(e.target.value as TradingType)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:py-2.5 lg:text-sm"
              >
                <option value={TradingType.INCOME}>
                  {t("voucher.main_view.table.types.income")}
                </option>
                <option value={TradingType.OUTCOME}>
                  {t("voucher.main_view.table.types.outcome")}
                </option>
                <option value={TradingType.TRANSFER}>
                  {t("voucher.main_view.table.types.transfer")}
                </option>
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          <div className="col-span-2">
            <label
              htmlFor="voucher-no"
              className="mb-2 block text-xs font-bold text-slate-600"
            >
              {t("voucher.detail_modal.fields.voucher_no")}
            </label>
            <div className="flex h-[36px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 lg:h-[42px]">
              <Hash size={20} className="text-slate-400" />
              <input
                id="voucher-no"
                aria-label="voucher.detail_modal.fields.voucher_no"
                type="text"
                value={editedVoucherId}
                onChange={(e) => setEditedVoucherId(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400 lg:text-sm"
                placeholder={t(
                  "voucher.detail_modal.fields.voucher_no_placeholder",
                )}
              />
            </div>
          </div>
        </div>

        {/* Info: (20260327 - Luphia) Section 2: Accounting Entries */}
        <div className="flex items-center justify-between gap-2 px-6 py-2">
          <h4 className="text-sm font-extrabold text-slate-700 lg:text-lg">
            {t("voucher.detail_modal.sections.accounting_entries")}
          </h4>
          <button
            type="button"
            onClick={addRow}
            className="hidden items-center gap-1 rounded-full bg-orange-100 px-4 py-2 text-xs font-bold text-orange-500 hover:bg-orange-200 sm:flex lg:text-sm"
          >
            <Plus size={16} className="stroke-[2.5]" />
            {t("voucher.detail_modal.actions.add_row")}
          </button>
        </div>

        <div className="mb-2 hidden px-4 sm:grid sm:grid-cols-11 sm:gap-x-1 sm:px-6">
          <div className="col-span-4 text-[10px] font-bold text-slate-600 lg:text-xs">
            {t("voucher.detail_modal.fields.account_code_name")}
          </div>
          <div className="col-span-3 pr-2 text-right text-[10px] font-bold text-slate-600 lg:text-xs">
            {t("voucher.detail_modal.fields.debit")}
          </div>
          <div className="col-span-3 pr-2 text-right text-[10px] font-bold text-slate-600 lg:text-xs">
            {t("voucher.detail_modal.fields.credit")}
          </div>
          <div className="col-span-1" />
        </div>

        {/* Info: (20260416 - Julian) Voucher Line Items */}
        <div className="mb-4 flex flex-col gap-3 px-4 sm:mb-2 sm:grid sm:grid-cols-11 sm:gap-x-1 sm:gap-y-2 sm:px-6">
          {voucherLineItems}
        </div>

        <div className="mb-4 px-4 sm:hidden">
          <button
            type="button"
            onClick={addRow}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 py-3 text-sm font-bold text-orange-500 hover:bg-orange-100 active:bg-orange-200"
          >
            <Plus size={18} className="stroke-[2.5]" />
            {t("voucher.detail_modal.actions.add_row")}
          </button>
        </div>

        {/* Info: (20260327 - Luphia) Notes */}
        <div className="mb-4 px-4 sm:px-6 lg:mb-8">
          <label
            htmlFor="voucher-note"
            className="mb-2 block text-xs font-bold text-slate-600"
          >
            {t("voucher.detail_modal.fields.note")}{" "}
            <span className="font-normal text-slate-400">
              ({t("common.optional_in_parentheses")})
            </span>
          </label>
          <div className="relative">
            <MessageSquare
              size={18}
              className="absolute top-3.5 left-4 text-slate-400"
            />
            <textarea
              id="voucher-note"
              aria-label="voucher.detail_modal.fields.note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[50px] w-full resize-none rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-11 text-xs leading-relaxed text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:min-h-[100px] lg:text-sm"
              placeholder={t("voucher.detail_modal.fields.note_placeholder")}
            />
          </div>
        </div>

        {/* Info: (20260327 - Luphia) Balance Check */}
        <div className="px-4 pb-4 sm:px-6">
          <div
            className={`rounded-xl border p-4 lg:p-5 ${isTotalBalanced ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale
                  size={18}
                  className={`shrink-0 ${isTotalBalanced ? "text-emerald-500" : "text-red-500"}`}
                />
                <h4 className="font-bold text-slate-700">
                  {t("voucher.detail_modal.balance_check.title")}
                </h4>
              </div>
              <div
                className={`flex items-center gap-1.5 text-sm font-bold ${isTotalBalanced ? "text-emerald-500" : "text-red-500"}`}
              >
                {isTotalBalanced ? (
                  <>
                    <CheckCircle2 size={18} className="shrink-0" />{" "}
                    {t("voucher.detail_modal.balance_check.balanced")}
                  </>
                ) : (
                  <>
                    <X size={18} className="shrink-0" />{" "}
                    {t("voucher.detail_modal.balance_check.unbalanced")}
                  </>
                )}
              </div>
            </div>
            <div className="my-4 border-t border-dashed border-slate-300"></div>
            <div className="flex items-end justify-between">
              <span className="text-sm font-bold text-slate-500">
                {t("voucher.detail_modal.fields.total_amount")}
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-800">
                ${" "}
                {MoneyUtil.format(
                  MoneyUtil.toDecimal(totalDebit).gt(
                    MoneyUtil.toDecimal(totalCredit),
                  )
                    ? totalDebit
                    : totalCredit,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260327 - Luphia) Footer Actions */}
      <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
        {checkHasChanges() && (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="mr-auto text-sm font-bold text-slate-500 hover:text-slate-700 sm:m-0"
          >
            {t("voucher.detail_modal.actions.cancel_edit")}
          </button>
        )}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
          {activeVoucher?.isVerified ? (
            <button
              type="button"
              disabled={disabledSaveButton || isSaving}
              onClick={() => setIsUnverifyModalOpen(true)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 text-xs font-bold text-white hover:bg-red-500 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm"
            >
              <X size={16} className="stroke-3" />
              {t("verify.button.unverify")}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabledSaveButton || isSaving}
              onClick={() => saveVoucher(true)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm"
            >
              <CheckCircle2 size={16} className="stroke-3" />
              {t("verify.button.verify")}
            </button>
          )}
          <button
            type="button"
            disabled={disabledSaveButton || isSaving}
            onClick={() => saveVoucher(activeVoucher?.isVerified)}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm"
          >
            <Save size={16} className="stroke-3" />
            {t("voucher.detail_modal.actions.save_only")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {VoucherContent}
      {/* Info: (20260327 - Luphia) Modals */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t("common.cancel_edit_title")}
        message={t("common.cancel_edit_message")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleCancelEdit}
      />
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={t(
          "voucher.detail_modal.confirm_modals.leave_without_saving.title",
        )}
        message={t(
          "voucher.detail_modal.confirm_modals.leave_without_saving.message",
        )}
        confirmText={t("voucher.detail_modal.actions.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={() => onClose()}
      />
      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title={t("voucher.detail_modal.confirm_modals.save_voucher.title")}
        message={t("voucher.detail_modal.confirm_modals.save_voucher.message")}
        confirmText={
          isSaving
            ? t("voucher.detail_modal.actions.saving")
            : t("voucher.detail_modal.actions.confirm")
        }
        cancelText={t("common.cancel")}
        onConfirm={executeSaveVoucher}
      />
      <ConfirmModal
        isOpen={isUnverifyModalOpen}
        onClose={() => setIsUnverifyModalOpen(false)}
        title={t("verify.unverify_modal.title")}
        message={t("verify.unverify_modal.message", {
          type: t("verify.type.voucher"),
        })}
        confirmText={t("verify.unverify_modal.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleUnverifyConfirmed}
      />

      <AccountBookSelector
        key={accountBookId}
        isOpen={isAccountBookSelectorOpen}
        onClose={() => setIsAccountBookSelectorOpen(false)}
        accountBookId={accountBookId}
        onSelect={(account) => {
          if (selectorTargetRowId) {
            const targetRow = rows.find((r) => r.id === selectorTargetRowId);
            if (targetRow) {
              updateRow(selectorTargetRowId, {
                ...targetRow,
                accountingCode: account.code,
                accounting: account,
              });
            }
          }
        }}
      />
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={activeVoucher?.file}
        title={t("voucher.detail_modal.sections.preview")}
      />
    </>
  );
}
