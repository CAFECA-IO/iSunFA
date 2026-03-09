"use client";

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  X,
  Plus,
  Download,
  Upload,
  ArrowRightLeft,
  ChevronDown,
  Search,
  Calendar,
  FileText,
  Save,
  Info,
  BookOpen,
} from "lucide-react";

interface IVoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId?: string; // Standard optional voucher prop for edits
}

export default function VoucherDetailModal({
  isOpen,
  onClose,
}: IVoucherDetailModalProps) {
  const [tradingType, setTradingType] = useState<
    "income" | "outcome" | "transfer"
  >("outcome");
  const [businessTax, setBusinessTax] = useState(false);
  const [fee, setFee] = useState(false);

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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-101 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative flex w-full max-w-6xl transform flex-col rounded-2xl bg-slate-50 text-left shadow-2xl transition-all">
                {/* Header Actions */}
                <button
                  type="button"
                  className="absolute top-4 right-4 z-10 rounded-full bg-slate-200 p-2 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
                  onClick={onClose}
                >
                  <X size={20} />
                </button>

                <div className="flex h-[90vh] w-full flex-col overflow-y-auto p-8 shadow-inner">
                  {/* Top Section: Split Layout */}
                  <div className="mb-8 flex w-full flex-col gap-8 lg:flex-row">
                    {/* Left: Invoice Preview/Upload Box */}
                    <div className="w-full shrink-0 lg:w-1/3">
                      <div className="group flex aspect-3/4 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-orange-400 hover:bg-orange-50">
                        <Plus
                          size={32}
                          className="mb-2 group-hover:text-orange-500"
                        />
                        <span className="font-medium group-hover:text-orange-500">
                          Invoice
                        </span>
                      </div>
                    </div>

                    {/* Right: Form */}
                    <div className="flex w-full flex-col gap-6 lg:w-2/3">
                      {/* Trading Type */}
                      <div>
                        <div className="mb-2 block text-sm font-semibold text-slate-700">
                          Trading Type <span className="text-red-500">*</span>
                        </div>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setTradingType("income")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] px-4 py-3 font-medium transition-colors ${
                              tradingType === "income"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-600 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Download size={18} /> Income
                          </button>
                          <button
                            type="button"
                            onClick={() => setTradingType("outcome")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] px-4 py-3 font-medium transition-colors ${
                              tradingType === "outcome"
                                ? "border-orange-400 bg-orange-100/50 text-orange-500 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Upload size={18} /> Outcome
                          </button>
                          <button
                            type="button"
                            onClick={() => setTradingType("transfer")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] px-4 py-3 font-medium transition-colors ${
                              tradingType === "transfer"
                                ? "border-slate-300 bg-slate-100 text-slate-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <ArrowRightLeft size={18} /> Transfer
                          </button>
                        </div>
                      </div>

                      {/* Pay from */}
                      <div>
                        <label htmlFor="payFrom" className="mb-2 block text-sm font-semibold text-slate-700">
                          Pay from <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select id="payFrom" className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none">
                            <option>1101 Cash on hand</option>
                            <option>1104 Cash in banks</option>
                          </select>
                          <ChevronDown
                            size={18}
                            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Trading Partner */}
                      <div>
                        <div className="mb-2 block text-sm font-semibold text-slate-700">
                          Trading Partner
                        </div>
                        <div className="flex w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                          <input
                            type="text"
                            aria-label="Trading Partner ID Number"
                            placeholder="ID Number"
                            className="w-[120px] border-r border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                          />
                          <div className="relative flex-1 bg-white">
                            <input
                              type="text"
                              aria-label="Trading Partner Name"
                              placeholder="Name"
                              className="w-full px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                            />
                            <Search
                              size={18}
                              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label htmlFor="invoiceIssueDate" className="mb-2 block text-sm font-semibold text-slate-700">
                            Invoice Issue Date{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full shadow-sm">
                            <input
                              id="invoiceIssueDate"
                              type="text"
                              defaultValue="2024-02-01"
                              placeholder="YYYY-MM-DD"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            />
                            <Calendar
                              size={18}
                              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label htmlFor="payingDate" className="mb-2 block text-sm font-semibold text-slate-700">
                            Paying Date <span className="text-red-500">*</span>
                          </label>
                          <div className="relative w-full shadow-sm">
                            <input
                              id="payingDate"
                              type="text"
                              defaultValue="2024-02-01"
                              placeholder="YYYY-MM-DD"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            />
                            <Calendar
                              size={18}
                              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 pb-3.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-sm font-medium whitespace-nowrap text-slate-500">
                            Same as invoice date
                          </span>
                        </label>
                      </div>

                      {/* Paying Reason */}
                      <div>
                        <label htmlFor="payingReason" className="mb-2 block text-sm font-semibold text-slate-700">
                          Paying Reason <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex w-full rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                          <input
                            id="payingReason"
                            type="text"
                            className="w-full rounded-l-xl px-4 py-3 text-sm text-slate-700 focus:outline-none"
                          />
                          <div className="flex items-center justify-center rounded-r-xl border-l border-slate-200 bg-slate-50 px-4">
                            <FileText size={18} className="text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Amount and Toggles */}
                      <div>
                        <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">
                          Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative mb-6 flex w-full items-center overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                          <input
                            id="amount"
                            type="number"
                            defaultValue="0"
                            className="w-full appearance-none px-4 py-3 pr-[100px] text-right text-sm text-slate-700 focus:outline-none"
                          />
                          <div className="absolute right-4 flex items-center gap-2 border-l border-slate-200 bg-white py-1 pl-4 select-none">
                            <span className="text-base leading-none">🇹🇼</span>
                            <span className="text-sm font-semibold text-slate-500">
                              TWD
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="flex items-center gap-3">
                            <button
                               aria-label="Toggle Business tax"
                              type="button"
                              onClick={() => setBusinessTax(!businessTax)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${businessTax ? "bg-orange-500" : "bg-slate-200"}`}
                            >
                              <div
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${businessTax ? "translate-x-5.5" : "translate-x-0.5"}`}
                              />
                            </button>
                            <span className="text-sm font-medium text-slate-600">
                              Business tax
                            </span>
                            <Info
                              size={16}
                              className="cursor-help text-slate-400 hover:text-slate-500"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                               aria-label="Toggle Fee"
                              type="button"
                              onClick={() => setFee(!fee)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${fee ? "bg-orange-500" : "bg-slate-200"}`}
                            >
                              <div
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${fee ? "translate-x-5.5" : "translate-x-0.5"}`}
                              />
                            </button>
                            <span className="text-sm font-medium text-slate-600">
                              Fee
                            </span>
                            <Info
                              size={16}
                              className="cursor-help text-slate-400 hover:text-slate-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      <div>
                        <label htmlFor="note" className="mb-2 block text-sm font-semibold text-slate-700">
                          Note
                        </label>
                        <input
                          id="note"
                          type="text"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Save Button */}
                      <div className="flex flex-1 items-end justify-end pt-4 pb-2">
                        <button className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffb732] px-10 py-3 font-bold text-slate-800 shadow-sm transition-colors hover:bg-[#ffaa1a] lg:w-auto">
                          Save <Save size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Divider and Journal List */}
                  <div className="w-full pt-8 pb-4">
                    <div className="mb-6 flex items-center gap-3 px-1 text-lg font-bold text-slate-700">
                      <div className="rounded-lg bg-slate-800 p-1.5 text-[#ffb732] shadow-sm">
                        <BookOpen size={20} />
                      </div>
                      <span>Journal List</span>
                    </div>

                    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full min-w-[1000px]">
                        <thead>
                          <tr className="border-b border-slate-200/60 bg-white text-left text-xs text-slate-500">
                            <th className="w-[120px] border-r border-slate-100 px-6 py-5 text-center font-semibold">
                              Trading Date{" "}
                              <span className="ml-1 text-slate-300">#</span>
                            </th>
                            <th className="border-r border-slate-100 px-6 py-5 font-semibold">
                              Trading Type
                            </th>
                            <th className="border-r border-slate-100 px-6 py-5 font-semibold">
                              Source
                            </th>
                            <th className="border-r border-slate-100 px-6 py-5 font-semibold">
                              Reason
                            </th>
                            <th className="border-r border-slate-100 px-6 py-5 font-semibold">
                              Trading Partner
                            </th>
                            <th className="w-[180px] border-r border-slate-100 px-6 py-5 font-semibold">
                              Amount{" "}
                              <span className="ml-1 text-slate-300">#</span>
                            </th>
                            <th className="px-6 py-5 font-semibold">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80 align-middle text-sm">
                          {/* Row 1 */}
                          <tr className="transition-colors hover:bg-slate-50/50">
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="mx-auto flex w-14 flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white p-1.5 shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500">
                                  2024
                                </div>
                                <div className="mt-1 mb-0.5 text-xs leading-none font-black text-[#ffb732]">
                                  Feb
                                </div>
                                <div className="text-xl leading-tight font-extrabold text-slate-800">
                                  1
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-100/80 px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-red-500">
                                <Upload size={14} className="stroke-[2.5]" />{" "}
                                Outcome
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1101
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash on hand
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  4110
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Sales revenue
                                </span>
                              </div>
                            </td>
                            <td className="flex flex-col gap-0.5 border-r border-slate-100/50 px-6 py-4">
                              <span className="pt-1.5 text-xs font-medium text-slate-400">
                                59373022
                              </span>
                              <span className="mb-1 text-sm font-bold whitespace-nowrap text-slate-600">
                                PX Mart
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="text-right text-base font-extrabold whitespace-nowrap text-slate-800">
                                1,785,000{" "}
                                <span className="ml-1 text-xs font-bold text-slate-400">
                                  TWD
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400">
                              Buy a printer
                            </td>
                          </tr>

                          {/* Row 2 */}
                          <tr className="transition-colors hover:bg-slate-50/50">
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="mx-auto flex w-14 flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white p-1.5 shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500">
                                  2024
                                </div>
                                <div className="mt-1 mb-0.5 text-xs leading-none font-black text-emerald-500">
                                  Apr
                                </div>
                                <div className="text-xl leading-tight font-extrabold text-slate-800">
                                  3
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-4 py-1.5 text-xs font-bold whitespace-nowrap text-emerald-600">
                                <Download size={14} className="stroke-[2.5]" />{" "}
                                Income
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1101
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash on hand
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  4650
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Technical Service I...
                                </span>
                              </div>
                            </td>
                            <td className="flex flex-col gap-0.5 border-r border-slate-100/50 px-6 py-4">
                              <span className="pt-1.5 text-xs font-medium text-slate-400">
                                59373024
                              </span>
                              <span className="mb-1 text-sm font-bold whitespace-nowrap text-slate-600">
                                PX Mart
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="text-right text-base font-extrabold whitespace-nowrap text-slate-800">
                                1,500,000{" "}
                                <span className="ml-1 text-xs font-bold text-slate-400">
                                  TWD
                                </span>
                              </div>
                            </td>
                            <td className="max-w-[150px] truncate px-6 py-4 text-xs font-medium text-slate-400">
                              This is where you can put note
                            </td>
                          </tr>

                          {/* Row 3 */}
                          <tr className="transition-colors hover:bg-slate-50/50">
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="mx-auto flex w-14 flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white p-1.5 shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500">
                                  2024
                                </div>
                                <div className="mt-1 mb-0.5 text-xs leading-none font-black text-emerald-500">
                                  Apr
                                </div>
                                <div className="text-xl leading-tight font-extrabold text-slate-800">
                                  3
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-emerald-600">
                                <Download size={14} className="stroke-[2.5]" />{" "}
                                Receivable
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1101
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash on hand
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  4110
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Sales revenue
                                </span>
                              </div>
                            </td>
                            <td className="flex flex-col gap-0.5 border-r border-slate-100/50 px-6 py-4">
                              <span className="pt-1.5 text-xs font-medium text-slate-400">
                                59373024
                              </span>
                              <span className="mb-1 text-sm font-bold whitespace-nowrap text-slate-600">
                                PX Mart
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="text-right text-base font-extrabold whitespace-nowrap text-slate-800">
                                1,500,000{" "}
                                <span className="ml-1 text-xs font-bold text-slate-400">
                                  TWD
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400"></td>
                          </tr>

                          {/* Row 4 */}
                          <tr className="transition-colors hover:bg-slate-50/50">
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="mx-auto flex w-14 flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white p-1.5 shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500">
                                  2024
                                </div>
                                <div className="mt-1 mb-0.5 text-xs leading-none font-black text-orange-400">
                                  May
                                </div>
                                <div className="text-xl leading-tight font-extrabold text-slate-800">
                                  4
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-100/80 px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-red-500">
                                <Upload size={14} className="stroke-[2.5]" />{" "}
                                Temp. Payment
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1104
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash in banks
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  6000
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Net Profit
                                </span>
                              </div>
                            </td>
                            <td className="flex flex-col gap-0.5 border-r border-slate-100/50 px-6 py-4">
                              <span className="pt-1.5 text-xs font-medium text-slate-400">
                                59373025
                              </span>
                              <span className="mb-1 text-sm font-bold whitespace-nowrap text-slate-600">
                                PX Mart
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="text-right text-base font-extrabold whitespace-nowrap text-slate-800">
                                1,200,000{" "}
                                <span className="ml-1 text-xs font-bold text-slate-400">
                                  TWD
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400">
                              Buy snacks
                            </td>
                          </tr>

                          {/* Row 5 */}
                          <tr className="transition-colors hover:bg-slate-50/50">
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="mx-auto flex w-14 flex-col items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-slate-300 bg-white p-1.5 shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500">
                                  2024
                                </div>
                                <div className="mt-1 mb-0.5 text-xs leading-none font-black text-slate-400">
                                  Jun
                                </div>
                                <div className="text-xl leading-tight font-extrabold text-slate-800">
                                  5
                                </div>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3.5 py-1.5 text-xs font-bold whitespace-nowrap text-slate-500">
                                <ArrowRightLeft
                                  size={14}
                                  className="stroke-[2.5]"
                                />{" "}
                                Transfer
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1104
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash in banks
                                </span>
                              </div>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-slate-400">
                                  1101
                                </span>
                                <span className="text-sm font-bold whitespace-nowrap text-slate-700">
                                  Cash on hand
                                </span>
                              </div>
                            </td>
                            <td className="flex flex-col gap-0.5 border-r border-slate-100/50 px-6 py-4">
                              <span className="pt-1.5 text-xs font-medium text-slate-400">
                                59373026
                              </span>
                              <span className="mb-1 text-sm font-bold whitespace-nowrap text-slate-600">
                                PX Mart
                              </span>
                            </td>
                            <td className="border-r border-slate-100/50 px-6 py-4">
                              <div className="text-right text-base font-extrabold whitespace-nowrap text-slate-800">
                                800,000{" "}
                                <span className="ml-1 text-xs font-bold text-slate-400">
                                  TWD
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-400">
                              Withdraw money
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
