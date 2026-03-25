"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  X,
  Hash,
  Plus,
  ChevronDown,
  Trash2,
  FileText,
  Scale,
  Save,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
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
}

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
        {/* Info: (20260317 - Julian) Accounting Code Select */}
        <div className="relative flex h-[42px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
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
        {/* Info: (20260317 - Julian) Particular Input */}
        <div className="h-[42px]">
          <input
            type="text"
            aria-label={t("voucher.detail_modal.fields.particular")}
            value={row.particular}
            placeholder={t("voucher.detail_modal.fields.particular")}
            onChange={(e) =>
              updateRow(row.id, { ...row, particular: e.target.value })
            }
            className="h-full w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Info: (20260317 - Julian) Debit */}
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
            if (val === "") {
              updateRow(row.id, { ...row, isDebit: null, amount: 0 });
            } else {
              updateRow(row.id, { ...row, isDebit: true, amount: Number(val) });
            }
          }}
          className="h-full w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>

      {/* Info: (20260317 - Julian) Credit */}
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
            if (val === "") {
              updateRow(row.id, { ...row, isDebit: null, amount: 0 });
            } else {
              updateRow(row.id, {
                ...row,
                isDebit: false,
                amount: Number(val),
              });
            }
          }}
          className="h-full w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>

      {/* Info: (20260317 - Julian) Trash Button */}
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
  const [voucherType, setVoucherType] = useState<TradingType>(
    TradingType.INCOME,
  );
  const [note, setNote] = useState<string>("");
  const [editedVoucherId, setEditedVoucherId] = useState<string>("");
  const [rows, setRows] = useState<IVoucherLineUI[]>([]);
  // const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isUnverifyModalOpen, setIsUnverifyModalOpen] =
    useState<boolean>(false);
  const [targetVerify, setTargetVerify] = useState<boolean>(false);

  // Info: (20260325 - Julian) Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  const [isAccountBookSelectorOpen, setIsAccountBookSelectorOpen] =
    useState(false);
  const [selectorTargetRowId, setSelectorTargetRowId] = useState<string | null>(
    null,
  );

  // Info: (20260311 - Julian) 從 API 取得傳票
  useEffect(() => {
    if (isOpen && voucherId && accountBookId) {
      const fetchVoucher = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<IVoucher>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`,
          );
          if (res.payload) {
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
          setIsLoading(false);
        }
      };

      fetchVoucher();
    }
  }, [isOpen, voucherId, accountBookId]);

  // Info: (20260311 - Julian) 顯示 Loading
  if (voucherId && (!activeVoucher || isLoading)) {
    return (
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={() => {}}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 z-101 flex items-center justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  // Info: (20260317 - Julian) 檢查是否有 activeVoucher
  if (!activeVoucher) return null;

  // Info: (20260311 - Julian) 已刪除傳票不可編輯
  if (activeVoucher?.isDeleted) return null;

  // Info: (20260310 - Julian) 檢查內容是否有變更
  const checkHasChanges = () => {
    if (!activeVoucher) return true;

    // Info: (20260310 - Julian) 檢查日期和分錄類別
    if (inputDate / 1000 !== (activeVoucher.tradingDate ?? 0)) return true;
    if (voucherType !== (activeVoucher.tradingType ?? TradingType.INCOME))
      return true;
    if (note !== (activeVoucher.note || "")) return true;
    if (editedVoucherId !== activeVoucher.id) return true;

    // Info: (20260310 - Julian) 檢查分錄數量
    const originalRows = activeVoucher.lineItems.lines || [];
    if (rows.length !== originalRows.length) return true;

    // Info: (20260310 - Julian) 檢查分錄內容
    return rows.some((row, i) => {
      const orig = originalRows[i];
      if (row.accounting?.code !== orig.accounting?.code) return true;
      if (row.particular !== orig.particular) return true;
      if (row.amount !== orig.amount) return true;
      if (row.isDebit !== orig.isDebit) return true;
      return false;
    });
  };

  // Info: (20260310 - Julian) 處理關閉視窗
  const handleAttemptClose = () => {
    if (checkHasChanges()) {
      setIsCloseModalOpen(true);
    } else {
      onClose();
    }
  };

  const creditRow = rows.filter((row) => row.isDebit === false);
  const debitRow = rows.filter((row) => row.isDebit === true);

  const totalCredit = creditRow.reduce((total, row) => total + row.amount, 0);
  const totalDebit = debitRow.reduce((total, row) => total + row.amount, 0);

  const isTotalBalanced = totalCredit === totalDebit;

  /**
   * Info: (20260310 - Julian) 以下情況不允許儲存
   * 1. 日期或分錄類別為空
   * 2. 借貸不平衡
   * 3. 分錄為空
   * 4. 有分錄的會計科目或金額為空
   */
  const disabledSaveButton =
    !editedVoucherId.trim() ||
    inputDate === 0 ||
    voucherType == null ||
    !isTotalBalanced ||
    rows.length === 0 ||
    rows.some((row) => row.accounting === null || row.amount === 0);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: `row-${rows.length + 1}`,
        accounting: null,
        particular: "",
        amount: 0,
        isDebit: null,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, newRow: IVoucherLineUI) => {
    setRows(rows.map((r) => (r.id === id ? newRow : r)));
  };

  const saveVoucher = (isVerified?: boolean) => {
    setTargetVerify(!!isVerified);
    setIsSaveModalOpen(true);
  };

  // Info: (20260311 - Julian) 更新傳票
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
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      if (res.code === ApiCode.SUCCESS || res.payload) {
        setIsSaveModalOpen(false);
        onClose();
      } else {
        console.error("Failed to save voucher:", res.message);
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

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-100"
          onClose={handleAttemptClose}
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

          <div className="fixed inset-0 z-101 flex w-screen items-center justify-center p-4 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel className="relative flex max-h-[90vh] w-full max-w-4xl transform flex-col rounded-2xl bg-[#F8FAFC] text-left shadow-2xl transition-all">
                {/* Info: (20260317 - Julian) Header */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-8 py-5">
                  <div className="flex items-center gap-3">
                    <DialogTitle
                      as="h3"
                      className="text-xl font-bold text-slate-800"
                    >
                      {t("voucher.detail_modal.title")}
                    </DialogTitle>
                    {/* Info: (20260324 - Julian) 顯示傳票狀態 */}
                    {activeVoucher.isVerified ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                        {t("verify.status.verified")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                        {t("verify.status.unverified")}
                      </span>
                    )}

                    {/* Info: (20260325 - Julian) 開啟憑證檔案預覽 */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!activeVoucher.file?.hash}
                    >
                      <ImageIcon size={14} />
                      {t("查看憑證檔案")}
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={handleAttemptClose}
                    className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                  >
                    <X size={20} className="stroke-[2.5]" />
                  </button>
                </div>

                {/* Info: (20260317 - Julian) Body Content */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Info: (20260317 - Julian) Form */}
                  <div className="flex w-full flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Info: (20260317 - Julian) Section 1: Basic Info */}
                      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={20} className="text-blue-900" />
                          <h4 className="text-base font-bold text-blue-900">
                            {t("voucher.detail_modal.sections.basic_info")}
                          </h4>
                        </div>
                        <AiConfidence
                          confidence={activeVoucher.confidence}
                          note={activeVoucher.aiNote}
                        />
                      </div>

                      <div className="mb-8 grid grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="voucherDate"
                            className="mb-2 block text-xs font-bold text-slate-600"
                          >
                            {t("voucher.detail_modal.fields.voucher_date")}
                          </label>
                          <input
                            id="voucherDate"
                            aria-label={t(
                              "voucher.detail_modal.fields.voucher_date",
                            )}
                            type="date"
                            value={
                              new Date(inputDate).toISOString().split("T")[0]
                            }
                            onChange={(e) =>
                              setInputDate(
                                isNaN(e.target.valueAsNumber)
                                  ? 0
                                  : e.target.valueAsNumber,
                              )
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="voucherType"
                            className="mb-2 block text-xs font-bold text-slate-600"
                          >
                            {t("voucher.detail_modal.fields.voucher_type")}
                          </label>
                          <div className="relative">
                            <select
                              id="voucherType"
                              value={voucherType}
                              onChange={(e) =>
                                setVoucherType(e.target.value as TradingType)
                              }
                              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
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
                              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 stroke-[2.5] text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label
                            htmlFor="voucherIdInput"
                            className="mb-2 block text-xs font-bold text-slate-600"
                          >
                            {t("voucher.detail_modal.fields.voucher_no")}
                          </label>
                          <div className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                            <Hash size={20} className="text-slate-400" />
                            <input
                              id="voucherIdInput"
                              aria-label={t(
                                "voucher.detail_modal.fields.voucher_no",
                              )}
                              type="text"
                              value={editedVoucherId}
                              onChange={(e) =>
                                setEditedVoucherId(e.target.value)
                              }
                              className="w-full bg-transparent text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-300"
                              placeholder={t(
                                "voucher.detail_modal.fields.voucher_no_placeholder",
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Info: (20260317 - Julian) Section 2: Accounting Entries */}
                      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign size={20} className="text-blue-900" />
                          <h4 className="text-base font-bold text-blue-900">
                            {t(
                              "voucher.detail_modal.sections.accounting_entries",
                            )}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-1 text-sm font-bold text-orange-500 transition-colors hover:text-orange-600"
                        >
                          <Plus size={16} className="stroke-3" />
                          {t("voucher.detail_modal.actions.add_row")}
                        </button>
                      </div>

                      {/* Info: (20260317 - Julian) Header Row */}
                      <div className="mb-2 flex items-center pr-10">
                        <div className="flex-1 text-xs font-bold text-slate-600">
                          {t("voucher.detail_modal.fields.account_code_name")}
                        </div>
                        <div className="w-[100px] pr-2 text-right text-xs font-bold text-slate-600">
                          {t("voucher.detail_modal.fields.debit")}
                        </div>
                        <div className="w-[100px] pr-2 text-right text-xs font-bold text-slate-600">
                          {t("voucher.detail_modal.fields.credit")}
                        </div>
                      </div>

                      {/* Info: (20260317 - Julian) Rows container */}
                      <div className="mb-4 grid grid-cols-11 gap-x-1 gap-y-2">
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

                      {/* Info: (20260317 - Julian) Balance Check */}
                      <div
                        className={`rounded-xl border p-5 ${isTotalBalanced ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scale
                              size={18}
                              className={
                                isTotalBalanced
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }
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
                                <CheckCircle2 size={18} />{" "}
                                {t(
                                  "voucher.detail_modal.balance_check.balanced",
                                )}
                              </>
                            ) : (
                              <>
                                <X size={18} />{" "}
                                {t(
                                  "voucher.detail_modal.balance_check.unbalanced",
                                )}
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
                            {numberWithCommas(
                              Math.max(totalDebit, totalCredit),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info: (20260317 - Julian) Footer Actions */}
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-8 py-5">
                      {checkHasChanges() && (
                        <button
                          type="button"
                          onClick={() => setIsClearModalOpen(true)}
                          className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
                        >
                          {t("voucher.detail_modal.actions.cancel_edit")}
                      </button>)}
                      <div className="ml-auto flex items-center gap-3">
                        {activeVoucher?.isVerified ? (
                          <button
                            type="button"
                            disabled={disabledSaveButton || isSaving}
                            onClick={() => setIsUnverifyModalOpen(true)}
                            className="flex h-10 items-center gap-2 rounded-xl bg-red-400 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-500 disabled:bg-slate-300"
                          >
                            <X size={16} className="stroke-3" />
                            {t("verify.button.unverify")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={disabledSaveButton || isSaving}
                            onClick={() => saveVoucher(true)}
                            className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:bg-slate-300"
                          >
                            <CheckCircle2 size={16} className="stroke-3" />
                            {t("verify.button.verify")}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={disabledSaveButton || isSaving}
                          onClick={() => saveVoucher(activeVoucher?.isVerified)}
                          className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:bg-slate-300"
                        >
                          <Save size={16} className="stroke-3" />
                          {t("voucher.detail_modal.actions.save_only")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {/* Info: (20260310 - Julian) Cancel Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title={t("取消修改？")}
        message={t("確定要取消修改嗎？資料將回到原始狀態。")}
        confirmText={t("確定")}
        cancelText={t("common.cancel")}
        onConfirm={() => {}}
      />

      {/* Info: (20260310 - Julian) Close Modal */}
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

      {/* Info: (20260310 - Julian) Save Modal */}
      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title={t("voucher.detail_modal.confirm_modals.save_voucher.title")}
        message={t("voucher.detail_modal.confirm_modals.save_voucher.message")}
        confirmText={
          isSaving ? "Saving..." : t("voucher.detail_modal.actions.confirm")
        }
        cancelText={t("common.cancel")}
        onConfirm={executeSaveVoucher}
      />

      {/* Info: (20260323 - Julian) Unverify Modal */}
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

      {/* Info: (20260317 - Julian) Account Book Selector */}
      <AccountBookSelector
        isOpen={isAccountBookSelectorOpen}
        onClose={() => setIsAccountBookSelectorOpen(false)}
        accountBookId={accountBookId}
        onSelect={(account) => {
          if (selectorTargetRowId) {
            const targetRow = rows.find((r) => r.id === selectorTargetRowId);
            if (targetRow) {
              updateRow(selectorTargetRowId, {
                ...targetRow,
                accounting: account,
              });
            }
          }
        }}
      />

      {/* Info: (20260325 - Julian) File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={activeVoucher?.file}
        title={t("voucher.detail_modal.sections.preview")}
      />
    </>
  );
}
