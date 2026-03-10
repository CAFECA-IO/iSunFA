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
import { IVoucher, mockVouchers, TradingType } from "@/interfaces/voucher";
import { IAccount } from "@/constants/accounts";
import { numberWithCommas } from "@/lib/utils/common";

interface IVoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId?: string;
  voucher?: IVoucher;
}

interface IVoucherLineUI {
  id: string;
  accounting: IAccount | null;
  particular: string;
  amount: number;
  isDebit: boolean | null;
}

export default function VoucherDetailModal({
  isOpen,
  onClose,
  voucherId,
}: IVoucherDetailModalProps) {
  const voucher = mockVouchers.find((v) => v.id === voucherId);

  const [inputDate, setInputDate] = useState<number>(voucher?.tradingDate ?? 0);
  const [voucherType, setVoucherType] = useState<TradingType>(
    voucher?.tradingType ?? TradingType.INCOME,
  );
  const [note, setNote] = useState<string>(voucher?.note ?? "");
  const [rows, setRows] = useState<IVoucherLineUI[]>(
    voucher?.lineItems.lines ?? [],
  );
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  // Info: (20260310 - Julian) If no voucher, return null
  if (!voucher) {
    return null;
  }

  const creditRow = rows.filter((row) => row.isDebit === false);
  const debitRow = rows.filter((row) => row.isDebit === true);

  const totalCredit = creditRow.reduce((total, row) => total + row.amount, 0);
  const totalDebit = debitRow.reduce((total, row) => total + row.amount, 0);

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: `row-${Date.now()}`,
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

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={onClose}>
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
                  {voucherId ? `Edit Voucher ${voucherId}` : "New Voucher"}
                </DialogTitle>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
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
                      Voucher Date
                      <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <input
                      id="voucherDate"
                      aria-label="Voucher Date"
                      type="date"
                      value={inputDate}
                      onChange={(e) => setInputDate(e.target.valueAsNumber)}
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
                      Voucher Type
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
                        <option value={TradingType.INCOME}>Payment</option>
                        <option value={TradingType.OUTCOME}>Receipt</option>
                        <option value={TradingType.TRANSFER}>Transfer</option>
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
                    Note
                  </label>
                  <input
                    id="noteField"
                    aria-label="Note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    type="text"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Info: (20260310 - Julian) Recurring Toggle */}
                <div className="mt-6 flex items-center gap-3">
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
                </div>

                {/* Info: (20260310 - Julian) Table Box */}
                <div className="mt-8 rounded-2xl bg-[#344865] p-6 shadow-sm">
                  {/* Info: (20260310 - Julian) Headers */}
                  <div className="mb-3 flex gap-4 px-1">
                    <div className="flex-3 text-sm font-semibold text-white">
                      Accounting
                    </div>
                    <div className="flex-3 text-sm font-semibold text-white">
                      Particulars
                    </div>
                    <div className="flex-2 text-sm font-semibold text-white">
                      Debit
                    </div>
                    <div className="flex-2 text-sm font-semibold text-white">
                      Credit
                    </div>
                    <div className="w-8"></div>{" "}
                    {/* Info: (20260310 - Julian) spacer for trash icon */}
                  </div>

                  {/* Info: (20260310 - Julian) Rows */}
                  <div className="flex flex-col gap-3">
                    {rows.map((row) => (
                      <div key={row.id} className="grid grid-cols-13 gap-4">
                        {/* Info: (20260310 - Julian) Accounting */}
                        <div className="col-span-3 flex h-[46px] flex-3 overflow-hidden rounded-xl bg-white focus-within:ring-2 focus-within:ring-orange-500">
                          <input
                            type="text"
                            aria-label="Accounting"
                            className="h-full w-full bg-transparent px-4 text-sm font-semibold text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="Select Accounting"
                            className="flex h-full w-12 items-center justify-center border-l border-slate-300 text-slate-600 transition-colors hover:bg-slate-50"
                          >
                            <BookOpen size={18} />
                          </button>
                        </div>
                        {/* Info: (20260310 - Julian) Particular */}
                        <div className="col-span-3 h-[46px] flex-3">
                          <input
                            type="text"
                            aria-label="Particulars"
                            className="h-full w-full rounded-xl bg-white px-4 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          />
                        </div>
                        {/* Info: (20260310 - Julian) Debit */}
                        <div className="col-span-3 h-[46px] flex-2">
                          <input
                            type="number"
                            aria-label="Debit"
                            placeholder="0"
                            className="h-full w-full appearance-none rounded-xl bg-white px-4 text-right text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          />
                        </div>
                        {/* Info: (20260310 - Julian) Credit */}
                        <div className="col-span-3 h-[46px] flex-2">
                          <input
                            type="number"
                            aria-label="Credit"
                            placeholder="0"
                            className="h-full w-full appearance-none rounded-xl bg-white px-4 text-right text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          />
                        </div>
                        {/* Info: (20260310 - Julian) Trash */}
                        <div className="flex h-[46px] w-8 items-center justify-center">
                          <button
                            type="button"
                            aria-label="Delete row"
                            onClick={() => removeRow(row.id)}
                            className="text-slate-300 transition-colors hover:text-white"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Info: (20260310 - Julian) Subtotals */}
                    <div className="grid grid-cols-13 gap-4">
                      <div className="col-start-7 col-end-10 text-right text-sm font-bold text-emerald-400">
                        {numberWithCommas(totalDebit)}
                      </div>
                      <div className="col-start-10 col-end-13 text-right text-sm font-bold text-emerald-400">
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
                      className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#FFB732] text-slate-900 shadow-sm transition-colors hover:bg-[#ffaa1a]"
                    >
                      <Plus size={22} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Info: (20260310 - Julian) Bottom Actions */}
                <div className="mt-10 flex justify-end gap-4">
                  <button
                    type="button"
                    className="rounded-lg bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    disabled
                    className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-[#E2E8F0] px-6 py-3 text-sm font-bold text-[#94A3B8] shadow-none"
                  >
                    Save Voucher <Save size={18} className="stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
