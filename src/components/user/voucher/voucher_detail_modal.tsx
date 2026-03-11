"use client";

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, ChevronDown, BookOpen, Trash2, Plus, Save } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { mockVouchers, TradingType,IVoucherLineUI } from "@/interfaces/voucher";
import {  mockAccounts } from "@/constants/accounts";
import { numberWithCommas } from "@/lib/utils/common";
import ConfirmModal from "@/components/common/confirm_modal";

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
  return (
    <div className="grid grid-cols-13 gap-2">
      {/* Info: (20260310 - Julian) Accounting */}
      <div className="col-span-3 flex h-[46px] flex-3 items-center overflow-hidden rounded-xl bg-white focus-within:ring-2 focus-within:ring-orange-500">
        <select
          id={`accounting-${row.id}`}
          value={row.accounting?.code || ""}
          onChange={(e) => {
            const acc =
              mockAccounts.find((a) => a.code === e.target.value) || null;
            updateRow(row.id, { ...row, accounting: acc });
          }}
          className="w-full appearance-none rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
        >
          <option value="" disabled>
            {t("voucher.detail_modal.fields.accounting_select")}
          </option>
          {mockAccounts.map((acc) => (
            <option key={acc.code} value={acc.code}>
              {acc.code} - {acc.name}
            </option>
          ))}
        </select>
        <div className="bg-white pr-2">
          <BookOpen size={20} className="text-slate-500" />
        </div>
      </div>
      {/* Info: (20260310 - Julian) Particular */}
      <div className="col-span-3 h-[46px] flex-3">
        <input
          type="text"
          aria-label={t("voucher.detail_modal.fields.particular")}
          value={row.particular}
          onChange={(e) =>
            updateRow(row.id, { ...row, particular: e.target.value })
          }
          className="h-full w-full rounded-xl bg-white px-4 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
        />
      </div>
      {/* Info: (20260310 - Julian) Debit */}
      <div className="col-span-3 h-[46px] flex-2">
        <input
          type="number"
          aria-label={t("voucher.detail_modal.fields.debit")}
          placeholder="0"
          value={row.isDebit === true ? row.amount || "" : ""}
          disabled={row.isDebit === false}
          min={0} // Info: (20260310 - Julian) 應為正數
          onWheel={(e) => e.currentTarget.blur()} // Info: (20260310 - Julian) 避免滾輪調整數值
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              updateRow(row.id, { ...row, isDebit: null, amount: 0 });
            } else {
              updateRow(row.id, { ...row, isDebit: true, amount: Number(val) });
            }
          }}
          className="h-full w-full appearance-none rounded-xl bg-white px-4 text-right text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-slate-300 disabled:text-slate-500"
        />
      </div>
      {/* Info: (20260310 - Julian) Credit */}
      <div className="col-span-3 h-[46px] flex-2">
        <input
          type="number"
          aria-label={t("voucher.detail_modal.fields.credit")}
          placeholder="0"
          value={row.isDebit === false ? row.amount || "" : ""}
          disabled={row.isDebit === true}
          min={0} // Info: (20260310 - Julian) 應為正數
          onWheel={(e) => e.currentTarget.blur()} // Info: (20260310 - Julian) 避免滾輪調整數值
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
          className="h-full w-full appearance-none rounded-xl bg-white px-4 text-right text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:bg-slate-300 disabled:text-slate-500"
        />
      </div>
      {/* Info: (20260310 - Julian) Trash */}
      <div className="flex h-[46px] w-8 items-center justify-center">
        <button
          type="button"
          aria-label="Delete row"
          onClick={() => removeRow(row.id)}
          className="text-slate-300 transition-colors hover:text-red-400"
        >
          <Trash2 size={20} />
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
  const activeVoucher = mockVouchers.find((v) => v.id === voucherId);

  const [inputDate, setInputDate] = useState<number>(
    activeVoucher?.tradingDate ?? 0,
  );
  const [voucherType, setVoucherType] = useState<TradingType>(
    activeVoucher?.tradingType ?? TradingType.INCOME,
  );
  const [note, setNote] = useState<string>(activeVoucher?.note ?? "");
  const [rows, setRows] = useState<IVoucherLineUI[]>(
    activeVoucher?.lineItems.lines ?? [],
  );
  // const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

  // Info: (20260310 - Julian) 如果找不到 voucher 就 return null
  if (voucherId && !activeVoucher) {
    return null;
  }

  // Info: (20260310 - Julian) 檢查內容是否有變更
  const checkHasChanges = () => {
    if (!activeVoucher) return true;

    // Info: (20260310 - Julian) 檢查日期和分錄類別
    if (inputDate !== (activeVoucher.tradingDate ?? 0)) return true;
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

  const saveVoucher = () => {
    console.log("saveVoucher");
    setIsSaveModalOpen(true);
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
                {/* Info: (20260310 - Julian) Header */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-8 py-5 shadow-sm">
                  <DialogTitle
                    as="h3"
                    className="text-xl font-bold text-slate-800"
                  >
                    {t("voucher.detail_modal.title")} {voucherId}
                  </DialogTitle>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={handleAttemptClose}
                    className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                  >
                    <X size={20} className="stroke-[2.5]" />
                  </button>
                </div>

                {/* Info: (20260310 - Julian) Body */}
                <div className="flex w-full flex-col overflow-y-auto px-8 py-8">
                  {/* Info: (20260310 - Julian) Top Fields */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Info: (20260310 - Julian) Left: Date */}
                    <div>
                      <label
                        htmlFor="voucherDate"
                        className="mb-2 block text-sm font-bold text-slate-500"
                      >
                        {t("voucher.detail_modal.fields.voucher_date")}
                        <span className="ml-0.5 text-red-500">*</span>
                      </label>
                      <input
                        id="voucherDate"
                        aria-label={t("voucher.detail_modal.fields.voucher_date")}
                        type="date"
                        value={
                          inputDate
                            ? new Date(inputDate * 1000).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setInputDate(
                            isNaN(e.target.valueAsNumber)
                              ? 0
                              : e.target.valueAsNumber,
                          )
                        }
                        placeholder="YYYY-MM-DD"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    {/* Info: (20260310 - Julian) Right: Type */}
                    <div>
                      <label
                        htmlFor="voucherType"
                        className="mb-2 block text-sm font-bold text-slate-500"
                      >
                        {t("voucher.detail_modal.fields.voucher_type")}
                        <span className="ml-0.5 text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="voucherType"
                          value={voucherType}
                          onChange={(e) =>
                            setVoucherType(e.target.value as TradingType)
                          }
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value={TradingType.INCOME}>{t("voucher.main_view.filters.type_options.payment")}</option>
                          <option value={TradingType.OUTCOME}>{t("voucher.main_view.filters.type_options.receipt")}</option>
                          <option value={TradingType.TRANSFER}>{t("voucher.main_view.filters.type_options.transfer")}</option>
                        </select>
                        <ChevronDown
                          size={18}
                          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 stroke-[2.5] text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Info: (20260310 - Julian) Note Field */}
                  <div className="mt-6">
                    <label
                      htmlFor="noteField"
                      className="mb-2 block text-sm font-bold text-slate-500"
                    >
                      {t("voucher.detail_modal.fields.note")}
                    </label>
                    <input
                      id="noteField"
                      aria-label={t("voucher.detail_modal.fields.note")}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      type="text"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Info: (20260310 - Julian) Recurring Toggle */}
                  {/* ToDo: (20260310 - Julian) 先隱藏 */}
                  {/* <div className="mt-6 flex items-center gap-3">
                    <button
                      id="recurringToggle"
                      type="button"
                      aria-label="Toggle recurring entry"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`relative h-6 w-11 rounded-full p-0.5 transition-colors ${
                        isRecurring ? "bg-orange-500" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                          isRecurring ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <label
                      htmlFor="recurringToggle"
                      className="cursor-pointer text-sm font-bold text-slate-600"
                    >
                      Recurring Entry
                    </label>
                  </div> */}

                  {/* Info: (20260310 - Julian) Table Box */}
                  <div className="mt-8 rounded-2xl bg-slate-600 p-6 shadow-sm">
                    {/* Info: (20260310 - Julian) Headers */}
                    <div className="mb-3 grid grid-cols-13 gap-2">
                      <div className="col-span-3 text-sm font-semibold text-white">
                        {t("voucher.detail_modal.fields.accounting")}
                      </div>
                      <div className="col-span-3 text-sm font-semibold text-white">
                        {t("voucher.detail_modal.fields.particular")}
                      </div>
                      <div className="col-span-3 text-sm font-semibold text-white">
                        {t("voucher.detail_modal.fields.debit")}
                      </div>
                      <div className="col-span-3 text-sm font-semibold text-white">
                        {t("voucher.detail_modal.fields.credit")}
                      </div>
                    </div>

                    {/* Info: (20260310 - Julian) Rows */}
                    <div className="flex flex-col gap-3">
                      {rows.map((row) => (
                        <VoucherRow
                          key={row.id}
                          row={row}
                          updateRow={updateRow}
                          removeRow={removeRow}
                        />
                      ))}

                      {/* Info: (20260310 - Julian) Subtotals */}
                      <div className="grid grid-cols-13 gap-2">
                        <div
                          className={`col-start-7 col-end-10 text-right text-sm font-bold ${isTotalBalanced ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {numberWithCommas(totalDebit)}
                        </div>
                        <div
                          className={`col-start-10 col-end-13 text-right text-sm font-bold ${isTotalBalanced ? "text-emerald-400" : "text-red-400"}`}
                        >
                          {numberWithCommas(totalCredit)}
                        </div>
                      </div>
                    </div>

                    {/* Info: (20260310 - Julian) Add Row Button */}
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        aria-label="Add Row"
                        onClick={addRow}
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-300 text-slate-900 shadow-sm transition-colors hover:bg-orange-400"
                      >
                        <Plus size={22} className="stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Info: (20260310 - Julian) Bottom Actions */}
                  <div className="mt-10 flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setIsClearModalOpen(true)}
                      className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {t("voucher.detail_modal.actions.clear_all")}
                    </button>
                    <button
                      type="button"
                      disabled={disabledSaveButton}
                      onClick={saveVoucher}
                      className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-none hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {t("voucher.detail_modal.actions.save_voucher")} <Save size={18} />
                    </button>
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
        title={t("voucher.detail_modal.confirm_modals.leave_without_saving.title")}
        message={t("voucher.detail_modal.confirm_modals.leave_without_saving.message")}
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
        confirmText={t("voucher.detail_modal.actions.confirm")}
        cancelText={t("voucher.detail_modal.actions.cancel")}
        onConfirm={() => {
          onClose();
        }}
      />
    </>
  );
}
