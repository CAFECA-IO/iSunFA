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
import { numberWithCommas } from "@/lib/utils/common";
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
}

// Info: (20260327 - Luphia) 若資料量大，可以使用 React.memo 包裝避免不必要的重新渲染
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
    <>
      <div className="col-span-4 flex flex-1 flex-col gap-2">
        <div className="relative flex h-[42px] items-center overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
          <button
            type="button"
            className="w-[250px] flex-1 appearance-none truncate bg-transparent px-4 py-2 text-left text-sm font-semibold text-slate-700 outline-none"
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
        <div className="h-[42px]">
          <input
            type="text"
            aria-label={t("voucher.detail_modal.fields.particular")}
            value={row.particular}
            placeholder={t("voucher.detail_modal.fields.particular")}
            onChange={(e) => updateRow(row.id, { ...row, particular: e.target.value })}
            className="h-full w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="col-span-3 h-[42px]">
        <input
          type="number"
          aria-label={t("voucher.detail_modal.fields.debit")}
          placeholder="0"
          value={row.isDebit === true ? row.amount || "" : ""}
          disabled={row.isDebit === false}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => {
            const val = e.target.value;
            updateRow(row.id, { ...row, isDebit: val === "" ? null : true, amount: val === "" ? 0 : Number(val) });
          }}
          className="h-full w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 text-right text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>

      <div className="col-span-3 h-[42px]">
        <input
          type="number"
          aria-label={t("voucher.detail_modal.fields.credit")}
          placeholder="0"
          value={row.isDebit === false ? row.amount || "" : ""}
          disabled={row.isDebit === true}
          min={0}
          onWheel={(e) => e.currentTarget.blur()}
          onChange={(e) => {
            const val = e.target.value;
            updateRow(row.id, { ...row, isDebit: val === "" ? null : false, amount: val === "" ? 0 : Number(val) });
          }}
          className="h-full w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 text-right text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>

      <div className="flex h-[42px] items-center justify-center p-2">
        <button
          type="button"
          aria-label="Delete row"
          onClick={() => removeRow(row.id)}
          className="text-slate-300 transition-colors hover:text-red-500"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </>
  );
};

export default function VoucherDetailModal({
  isOpen,
  onClose,
  voucherId,
}: IVoucherDetailModalProps) {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

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
  const [isAccountBookSelectorOpen, setIsAccountBookSelectorOpen] = useState(false);
  const [selectorTargetRowId, setSelectorTargetRowId] = useState<string | null>(null);

  // Info: (20260327 - Luphia) 處理 Fetch，並加入 abort/ignore 避免競態條件
  useEffect(() => {
    let isMounted = true;
    if (isOpen && voucherId && accountBookId) {
      const fetchVoucher = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<IVoucher>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`
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
    let credit = 0;
    let debit = 0;
    rows.forEach(row => {
      if (row.isDebit === false) credit += row.amount;
      if (row.isDebit === true) debit += row.amount;
    });
    return {
      totalCredit: credit,
      totalDebit: debit,
      isTotalBalanced: credit > 0 && debit > 0 && credit === debit, // Info: (20260327 - Luphia) 確保不全是 0
    };
  }, [rows]);

  const disabledSaveButton = useMemo(() => {
    return (
      !editedVoucherId.trim() ||
      inputDate === 0 ||
      voucherType == null ||
      !isTotalBalanced ||
      rows.length === 0 ||
      rows.some((row) => row.accounting === null || row.amount === 0)
    );
  }, [editedVoucherId, inputDate, voucherType, isTotalBalanced, rows]);

  // Info: (20260327 - Luphia) 使用 useCallback 搭配 Functional Update，避免不必要的重新渲染
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { id: `row-${Date.now()}`, accounting: null, particular: "", amount: 0, isDebit: null },
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
    if (voucherType !== (activeVoucher.tradingType ?? TradingType.INCOME)) return true;
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
        { method: "PUT", body: JSON.stringify(payload) }
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

  const VoucherContent = (
    <div className="flex h-full w-full flex-col bg-[#F8FAFC] overflow-hidden">

      {/* Info: (20260327 - Luphia) Body Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[10px]">
        {/* Info: (20260327 - Luphia) Section 1: Basic Info */}
        <div className="flex shrink-0 flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <AiConfidence confidence={activeVoucher.confidence} note={activeVoucher.aiNote} />
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 px-6 pt-4">
          <div>
            <label htmlFor="voucher-date" className="mb-2 block text-xs font-bold text-slate-600">
              {t("voucher.detail_modal.fields.voucher_date")}
            </label>
            <input
              id="voucher-date"
              aria-label={String(t("voucher.detail_modal.fields.voucher_date"))}
              type="date"
              value={new Date(inputDate).toISOString().split("T")[0]}
              onChange={(e) => setInputDate(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">
              {t("voucher.detail_modal.fields.voucher_type")}
            </label>
            <div className="relative">
              <select
                value={voucherType ?? ""}
                onChange={(e) => setVoucherType(e.target.value as TradingType)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value={TradingType.INCOME}>{t("voucher.main_view.table.types.income")}</option>
                <option value={TradingType.OUTCOME}>{t("voucher.main_view.table.types.outcome")}</option>
                <option value={TradingType.TRANSFER}>{t("voucher.main_view.table.types.transfer")}</option>
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="col-span-2">
            <label htmlFor="voucher-no" className="mb-2 block text-xs font-bold text-slate-600">
              {t("voucher.detail_modal.fields.voucher_no")}
            </label>
            <div className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 text-slate-700">
              <Hash size={20} className="text-slate-400" />
              <input
                id="voucher-no"
                aria-label={String(t("voucher.detail_modal.fields.voucher_no"))}
                type="text"
                value={editedVoucherId}
                onChange={(e) => setEditedVoucherId(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                placeholder={t("voucher.detail_modal.fields.voucher_no_placeholder")}
              />
            </div>
          </div>
        </div>

        {/* Info: (20260327 - Luphia) Section 2: Accounting Entries */}
        <div className="mb-3 mt-6 flex flex-col items-start justify-between gap-2 px-6 sm:flex-row sm:items-center">
          <h4 className="text-sm font-bold text-slate-700">
            {t("voucher.detail_modal.sections.accounting_entries")}
          </h4>
          <button type="button" onClick={addRow} className="flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600">
            <Plus size={16} className="stroke-[2.5]" />
            {t("voucher.detail_modal.actions.add_row")}
          </button>
        </div>

        <div className="mb-2 flex items-center px-6 pr-10">
          <div className="flex-1 text-xs font-bold text-slate-600">{t("voucher.detail_modal.fields.account_code_name")}</div>
          <div className="w-[100px] pr-2 text-right text-xs font-bold text-slate-600">{t("voucher.detail_modal.fields.debit")}</div>
          <div className="w-[100px] pr-2 text-right text-xs font-bold text-slate-600">{t("voucher.detail_modal.fields.credit")}</div>
        </div>

        <div className="mb-4 grid grid-cols-11 gap-x-1 gap-y-2 px-6">
          {rows.map((row) => (
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
          ))}
        </div>

        {/* Info: (20260327 - Luphia) Notes */}
        <div className="mb-8 px-6">
          <label htmlFor="voucher-note" className="mb-2 block text-xs font-bold text-slate-600">
            {t("voucher.detail_modal.fields.note")} <span className="font-normal text-slate-400">({t("common.optional_in_parentheses")})</span>
          </label>
          <div className="relative">
            <MessageSquare size={18} className="absolute left-4 top-3.5 text-slate-400" />
            <textarea
              id="voucher-note"
              aria-label={String(t("voucher.detail_modal.fields.note"))}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px] w-full resize-none rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm leading-relaxed text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              placeholder={t("voucher.detail_modal.fields.note_placeholder")}
            />
          </div>
        </div>

        {/* Info: (20260327 - Luphia) Balance Check */}
        <div className="px-6 pb-4">
          <div className={`rounded-xl border p-5 ${isTotalBalanced ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={18} className={isTotalBalanced ? "text-emerald-500" : "text-red-500"} />
              <h4 className="font-bold text-slate-700">{t("voucher.detail_modal.balance_check.title")}</h4>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-bold ${isTotalBalanced ? "text-emerald-500" : "text-red-500"}`}>
              {isTotalBalanced ? (
                <><CheckCircle2 size={18} /> {t("voucher.detail_modal.balance_check.balanced")}</>
              ) : (
                <><X size={18} /> {t("voucher.detail_modal.balance_check.unbalanced")}</>
              )}
            </div>
          </div>
          <div className="my-4 border-t border-dashed border-slate-300"></div>
          <div className="flex items-end justify-between">
            <span className="text-sm font-bold text-slate-500">{t("voucher.detail_modal.fields.total_amount")}</span>
            <span className="text-2xl font-black tracking-tight text-slate-800">
              $ {numberWithCommas(Math.max(totalDebit, totalCredit))}
            </span>
          </div>
        </div>
      </div>
      </div>

      {/* Info: (20260327 - Luphia) Footer Actions */}
      <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
        {checkHasChanges() && (
          <button type="button" onClick={() => setIsCancelModalOpen(true)} className="mr-auto text-sm font-bold text-slate-500 hover:text-slate-700 sm:m-0">
            {t("voucher.detail_modal.actions.cancel_edit")}
          </button>
        )}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
          {activeVoucher?.isVerified ? (
            <button type="button" disabled={disabledSaveButton || isSaving} onClick={() => setIsUnverifyModalOpen(true)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 text-xs font-bold text-white hover:bg-red-500 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm">
              <X size={16} className="stroke-3" />
              {t("verify.button.unverify")}
            </button>
          ) : (
            <button type="button" disabled={disabledSaveButton || isSaving} onClick={() => saveVoucher(true)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-white hover:bg-emerald-500 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm">
              <CheckCircle2 size={16} className="stroke-3" />
              {t("verify.button.verify")}
            </button>
          )}
          <button type="button" disabled={disabledSaveButton || isSaving} onClick={() => saveVoucher(activeVoucher?.isVerified)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white hover:bg-orange-600 disabled:bg-slate-300 sm:flex-none sm:px-6 sm:text-sm">
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
      <ConfirmModal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title={t("common.cancel_edit_title")} message={t("common.cancel_edit_message")} confirmText={t("common.confirm")} cancelText={t("common.cancel")} onConfirm={handleCancelEdit} />
      <ConfirmModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title={t("voucher.detail_modal.confirm_modals.leave_without_saving.title")} message={t("voucher.detail_modal.confirm_modals.leave_without_saving.message")} confirmText={t("voucher.detail_modal.actions.confirm")} cancelText={t("common.cancel")} onConfirm={() => onClose()} />
      <ConfirmModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title={t("voucher.detail_modal.confirm_modals.save_voucher.title")} message={t("voucher.detail_modal.confirm_modals.save_voucher.message")} confirmText={isSaving ? "Saving..." : t("voucher.detail_modal.actions.confirm")} cancelText={t("common.cancel")} onConfirm={executeSaveVoucher} />
      <ConfirmModal isOpen={isUnverifyModalOpen} onClose={() => setIsUnverifyModalOpen(false)} title={t("verify.unverify_modal.title")} message={t("verify.unverify_modal.message", { type: t("verify.type.voucher") })} confirmText={t("verify.unverify_modal.confirm")} cancelText={t("common.cancel")} onConfirm={handleUnverifyConfirmed} />

      <AccountBookSelector
        isOpen={isAccountBookSelectorOpen}
        onClose={() => setIsAccountBookSelectorOpen(false)}
        accountBookId={accountBookId}
        onSelect={(account) => {
          if (selectorTargetRowId) {
            const targetRow = rows.find((r) => r.id === selectorTargetRowId);
            if (targetRow) {
              updateRow(selectorTargetRowId, { ...targetRow, accounting: account });
            }
          }
        }}
      />
      <FilePreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} file={activeVoucher?.file} title={t("voucher.detail_modal.sections.preview")} />
    </>
  );
}
