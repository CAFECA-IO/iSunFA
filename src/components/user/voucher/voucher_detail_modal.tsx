"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, ChevronDown, Trash2, Plus, Save, FileText, DollarSign, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { IVoucher, TradingType, IVoucherLineUI, VoucherStatus } from "@/interfaces/voucher";
import { numberWithCommas } from "@/lib/utils/common";
import ConfirmModal from "@/components/common/confirm_modal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { useParams } from "next/navigation";
import { ACCOUNTS } from "@/constants/accounts";
import { FilePreview } from "@/components/common/file_preview";

interface IVoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId: string;
}

const VoucherRow = ({
  row,
  updateRow,
  removeRow,
}: {
  row: IVoucherLineUI;
  updateRow: (id: string, newRow: IVoucherLineUI) => void;
  removeRow: (id: string) => void;
}) => {
  const { t } = useTranslation();
  const accountOptions = ACCOUNTS.TW;

  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="flex-1 flex flex-col gap-2">
        {/* Info: (20260317 - Julian) Accounting Code Select */}
        <div className="relative flex h-[42px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
          <select
            id={`accounting-${row.id}`}
            value={row.accounting?.code || ""}
            onChange={(e) => {
              const acc = accountOptions.find((a) => a.code === e.target.value) || null;
              updateRow(row.id, { ...row, accounting: acc });
            }}
            className="w-full appearance-none bg-transparent px-4 py-2 text-sm font-semibold text-slate-700 outline-none"
          >
            <option value="" disabled>
              {t("voucher.detail_modal.fields.accounting_select") || "選擇會計科目"}
            </option>
            {accountOptions.map((acc) => (
              <option key={acc.code} value={acc.code}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
          <div className="bg-white pr-3">
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
        {/* Info: (20260317 - Julian) Particular Input */}
        <div className="h-[42px]">
          <input
            type="text"
            aria-label={t("voucher.detail_modal.fields.particular")}
            value={row.particular}
            placeholder={t("voucher.detail_modal.fields.particular") || "摘要"}
            onChange={(e) => updateRow(row.id, { ...row, particular: e.target.value })}
            className="h-full w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          />
        </div>
      </div>
      
      {/* Info: (20260317 - Julian) Debit */}
      <div className="h-[42px] w-[100px]">
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
      <div className="h-[42px] w-[100px]">
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
              updateRow(row.id, { ...row, isDebit: false, amount: Number(val) });
            }
          }}
          className="h-full w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 text-right text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
        />
      </div>

      {/* Info: (20260317 - Julian) Trash Button */}
      <div className="flex h-[42px] p-2 items-center justify-center">
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
  const [rows, setRows] = useState<IVoucherLineUI[]>([]);
  // const [isRecurring, setIsRecurring] = useState<boolean>(false);

  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<VoucherStatus>();

  // Info: (20260311 - Julian) 從 API 取得傳票
  useEffect(() => {
    if (isOpen && voucherId && accountBookId) {
      const fetchVoucher = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<{ result: IVoucher }>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`,
          );
          if (res.payload?.result) {
            const v = res.payload.result;
            setActiveVoucher(v);
            setInputDate(v.tradingDate * 1000);
            setVoucherType(v.tradingType);
            setNote(v.note || "");
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

  const saveVoucher = (status?: VoucherStatus) => {
    setTargetStatus(status);
    setIsSaveModalOpen(true);
  };

  // Info: (20260311 - Julian) 更新傳票
  const executeSaveVoucher = async () => {
    setIsSaving(true);
    try {
      const payload = { inputDate, voucherType, note, rows, targetStatus };
      const res = await request<IApiResponse<{ voucher: IVoucher }>>(
        `/api/v1/user/account_book/${accountBookId}/voucher/${voucherId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
      if (res.code === ApiCode.SUCCESS || res.payload?.voucher) {
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
              <DialogPanel className="relative flex max-h-[90vh] w-full max-w-6xl transform flex-col rounded-2xl bg-[#F8FAFC] text-left shadow-2xl transition-all">
                {/* Info: (20260317 - Julian) Header */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-8 py-5">
                  <div className="flex items-center gap-3">
                    <DialogTitle
                      as="h3"
                      className="text-xl font-bold text-slate-800"
                    >
                      {t("voucher.detail_modal.title")}
                    </DialogTitle>
                    {activeVoucher?.status === "MANUAL" && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                        待核對
                      </span>
                    )}
                    {activeVoucher?.status === "VERIFIED" && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                        已核對
                      </span>
                    )}
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
                  {/* Info: (20260317 - Julian) Left Side: File Preview */}
                  <div className="relative flex w-1/2 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 p-6">
                    <div className="absolute top-6 left-6 z-10 w-fit rounded-sm bg-slate-600 px-2 py-1 text-xs font-bold text-white opacity-80 shadow-sm">
                      Preview
                    </div>
                    
                    <div className="mb-4 mt-2 flex items-center justify-center">
                       <div className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm">
                         原始憑證影像
                       </div>
                    </div>

                    <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                      {activeVoucher?.file ? (
                        <FilePreview
                          file={{
                            filename: activeVoucher.file.fileName || "Unknown",
                          }}
                          fileId={activeVoucher.file.hash}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          {t("voucher.detail_modal.no_image")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info: (20260317 - Julian) Right Side: Form */}
                  <div className="flex w-1/2 flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Info: (20260317 - Julian) Section 1: Basic Info */}
                      <div className="pb-1 mb-3 flex border-b border-slate-200 items-center gap-2">
                        <FileText size={20} className="text-blue-900" />
                        <h4 className="text-base font-bold text-blue-900">傳票基礎資訊</h4>
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
                            aria-label={t("voucher.detail_modal.fields.voucher_date")}
                            type="date"
                            value={new Date(inputDate).toISOString().split("T")[0]}
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
                              <option value={TradingType.INCOME}>收入傳票</option>
                              <option value={TradingType.OUTCOME}>支出傳票</option>
                              <option value={TradingType.TRANSFER}>轉帳傳票</option>
                            </select>
                            <ChevronDown
                              size={18}
                              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 stroke-[2.5] text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <div className="mb-2 block text-xs font-bold text-slate-600">
                            傳票編號
                          </div>
                          <div className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm">
                            <span className="text-slate-400">#</span>
                            {voucherId}
                          </div>
                        </div>
                      </div>

                      {/* Info: (20260317 - Julian) Section 2: Accounting Entries */}
                      <div className="pb-1 mb-3 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <DollarSign size={20} className="text-blue-900" />
                          <h4 className="text-base font-bold text-blue-900">會計科目分錄</h4>
                        </div>
                        <button
                          type="button"
                          onClick={addRow}
                          className="flex items-center gap-1 text-sm font-bold text-orange-500 transition-colors hover:text-orange-600"
                        >
                          <Plus size={16} className="stroke-3" />
                          新增分錄
                        </button>
                      </div>

                      {/* Info: (20260317 - Julian) Header Row */}
                      <div className="mb-2 flex items-center pr-10">
                        <div className="flex-1 text-xs font-bold text-slate-600">科目代碼 / 名稱</div>
                        <div className="w-[100px] text-right text-xs font-bold text-slate-600 pr-2">借方</div>
                        <div className="w-[100px] text-right text-xs font-bold text-slate-600 pr-2">貸方</div>
                      </div>

                      {/* Info: (20260317 - Julian) Rows container */}
                      <div className="flex flex-col">
                        {rows.map((row) => (
                          <VoucherRow
                            key={row.id}
                            row={row}
                            updateRow={updateRow}
                            removeRow={removeRow}
                          />
                        ))}
                      </div>

                      {/* Info: (20260317 - Julian) Balance Check */}
                      <div className={`rounded-xl border p-5 ${isTotalBalanced ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                         <div className="flex items-center justify-between mb-4">
                           <span className="text-sm font-bold text-slate-700">借貸平衡檢查</span>
                           <div className={`flex items-center gap-1.5 text-sm font-bold ${isTotalBalanced ? 'text-emerald-500' : 'text-red-500'}`}>
                             {isTotalBalanced ? (
                               <><CheckCircle2 size={18} /> 已平衡</>
                             ) : (
                               <><X size={18} /> 未平衡</>
                             )}
                           </div>
                         </div>
                         <div className="border-t border-dashed border-slate-300 my-4"></div>
                         <div className="flex items-end justify-between">
                            <span className="text-sm font-bold text-slate-500">總計金額 (Voucher Total)</span>
                            <span className="text-2xl font-black tracking-tight text-slate-800">$ {numberWithCommas(Math.max(totalDebit, totalCredit))}</span>
                         </div>
                      </div>
                    </div>

                    {/* Info: (20260317 - Julian) Footer Actions */}
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-8 py-5">
                      <button
                        type="button"
                        onClick={() => setIsClearModalOpen(true)}
                        className="text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
                      >
                        取消修改
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={disabledSaveButton || isSaving}
                          onClick={() => saveVoucher(VoucherStatus.VERIFIED)}
                          className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:bg-slate-300"
                        >
                          <CheckCircle2 size={16} className="stroke-3" />
                          核對並存檔
                        </button>
                        <button
                          type="button"
                          disabled={disabledSaveButton || isSaving}
                          onClick={() => saveVoucher()}
                          className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:bg-slate-300"
                        >
                          <Save size={16} className="stroke-3" />
                          僅儲存修改
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

      {/* Info: (20260310 - Julian) Clear Modal */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title={t("voucher.detail_modal.confirm_modals.clear_all.title")}
        message={t("voucher.detail_modal.confirm_modals.clear_all.message")}
        confirmText={t("voucher.detail_modal.actions.confirm")}
        cancelText={t("voucher.detail_modal.actions.cancel")}
        onConfirm={() => {
          setRows([]);
          setInputDate(0);
          setVoucherType(TradingType.INCOME);
          setNote("");
          // setIsRecurring(false);
        }}
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
        cancelText={t("voucher.detail_modal.actions.cancel")}
        onConfirm={() => {
          onClose();
        }}
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
        cancelText={t("voucher.detail_modal.actions.cancel")}
        onConfirm={executeSaveVoucher}
      />
    </>
  );
}
