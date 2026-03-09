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
import { DialogTitle } from "@headlessui/react";
import { IVoucher, TradingType, mockVouchers } from "@/interfaces/voucher";
import { FilePreview } from "@/components/common/file_preview";
import ZoomablePreview from "@/components/common/zoomable_preview";
import { timestampToString } from "@/lib/utils/common";

interface IVoucherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherId?: string; // Standard optional voucher prop for edits
  voucher?: IVoucher;
}

const JournalRow = ({ voucher }: { voucher: IVoucher }) => {
  const renderIcon = (type: TradingType) => {
    switch (type) {
      case TradingType.INCOME:
        return <Download size={14} className="stroke-[2.5]" />;
      case TradingType.OUTCOME:
        return <Upload size={14} className="stroke-[2.5]" />;
      case TradingType.TRANSFER:
        return <ArrowRightLeft size={14} className="stroke-[2.5]" />;
      default:
        return null;
    }
  };

  const getTypeClasses = (style: TradingType) => {
    switch (style) {
      case TradingType.OUTCOME:
        return "bg-emerald-200 text-emerald-600";
      case TradingType.INCOME:
        return "bg-red-200 text-red-500";
      case TradingType.TRANSFER:
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <tr
      key={voucher.id}
      className="border-b border-gray-100 transition-colors last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
    >
      <td className="relative px-3 py-4 text-xs font-medium text-gray-900 sm:px-6 sm:text-sm">
        {voucher.hasRead && (
          <div className="absolute top-1/2 -left-1 z-10 -mt-1 h-2 w-2 rounded-full bg-red-500 sm:left-2" />
        )}
        {timestampToString(voucher.tradingDate).dateAndTime}
      </td>
      <td className="px-3 py-4 sm:px-6">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${getTypeClasses(voucher.tradingType)}`}
        >
          {renderIcon(voucher.tradingType)} {voucher.tradingType}
        </span>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-slate-400">
            {voucher.sourceId}
          </span>
          <span className="text-[13px] font-bold whitespace-nowrap text-slate-700">
            {voucher.sourceName}
          </span>
        </div>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-slate-400">
            {voucher.reasonId}
          </span>
          <span className="text-[13px] font-bold whitespace-nowrap text-slate-700">
            {voucher.reasonName}
          </span>
        </div>
      </td>
      <td className="px-3 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          {voucher.partnerId && (
            <span className="text-[11px] font-semibold text-slate-400">
              {voucher.partnerId}
            </span>
          )}
          {voucher.partnerName && (
            <span className="mt-0.5 text-[13px] leading-none font-bold whitespace-nowrap text-slate-600">
              {voucher.partnerName}
            </span>
          )}
        </div>
      </td>
      <td className="flex items-baseline gap-1 px-3 py-4 text-left align-middle text-base font-black whitespace-nowrap text-slate-700 sm:px-6">
        {voucher.amount}{" "}
        <span className="text-[11px] font-bold text-slate-400">
          {voucher.currency}
        </span>
      </td>
      <td className="max-w-[250px] px-3 py-4 text-xs font-medium text-slate-400 sm:px-6">
        <div className="w-full truncate" title={voucher.note}>
          {voucher.note}
        </div>
      </td>
    </tr>
  );
};

const JournalList = () => {
  return (
    <div className="w-full p-8">
      <div className="mb-6 flex items-center gap-3 px-1 text-lg font-bold text-slate-700">
        <div className="rounded-lg bg-slate-800 p-1.5 text-[#ffb732] shadow-sm">
          <BookOpen size={20} />
        </div>
        <span>Journal List</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-slate-100 text-xs font-semibold text-gray-600 sm:text-base">
            <tr>
              <th scope="col" className="w-[160px] px-3 py-3 sm:px-6">
                Trading Date
              </th>
              <th scope="col" className="px-3 py-3 sm:px-6">
                Trading Type
              </th>
              <th scope="col" className="px-3 py-3 sm:px-6">
                Source
              </th>
              <th scope="col" className="px-3 py-3 sm:px-6">
                Reason
              </th>
              <th scope="col" className="px-3 py-3 sm:px-6">
                Trading Partner
              </th>
              <th scope="col" className="w-[180px] px-3 py-3 sm:px-6">
                Amount
              </th>
              <th scope="col" className="min-w-[200px] px-3 py-3 sm:px-6">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="align-middle text-sm">
            {mockVouchers.map((v) => (
              <JournalRow key={v.id} voucher={v} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function VoucherDetailModal({
  isOpen,
  onClose,
  voucher,
}: IVoucherDetailModalProps) {
  const [tradingType, setTradingType] = useState<TradingType>(
    voucher?.tradingType || TradingType.OUTCOME,
  );
  const [businessTax, setBusinessTax] = useState(voucher?.businessTax || false);
  const [fee, setFee] = useState(voucher?.fee || false);

  const tradingTypeOptions = Object.values(TradingType).map((type) => {
    const icon =
      type === TradingType.INCOME ? (
        <Download size={18} />
      ) : TradingType.OUTCOME ? (
        <Upload size={18} />
      ) : (
        <ArrowRightLeft size={18} />
      );

    return (
      <button
        key={type}
        type="button"
        onClick={() => setTradingType(type)}
        className={`transition-color flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-base font-semibold ${
          tradingType === type
            ? "border-orange-500 bg-orange-100 text-orange-600 shadow-sm"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {icon} <span>{type}</span>
      </button>
    );
  });

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

        <div className="fixed inset-0 z-101 flex w-screen items-center justify-center">
          <div className="flex max-h-[90vh] items-center justify-center p-4 text-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative flex w-full max-w-6xl transform flex-col rounded-2xl bg-slate-50 text-left shadow-2xl transition-all duration-200 ease-in-out">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <DialogTitle
                    as="h3"
                    className="text-xl font-semibold text-gray-900"
                  >
                    傳票詳情
                  </DialogTitle>
                  <button
                    type="button"
                    className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex max-h-[80vh] w-full flex-col overflow-y-auto shadow-inner">
                  {/* Top Section: Split Layout */}
                  <div className="grid w-full grid-cols-5">
                    {/* Left: File Preview */}
                    <ZoomablePreview
                      hasContent={!!voucher?.file?.hash}
                      fallbackText="No file available"
                      className="col-span-2 h-full"
                    >
                      {voucher?.file?.hash && (
                        <FilePreview
                          file={{
                            filename: voucher.file.fileName || "Unknown",
                          }}
                          fileId={voucher.file.hash}
                        />
                      )}
                    </ZoomablePreview>
                    {/* Right: Form */}
                    <div className="col-span-3 flex w-full flex-col gap-6 p-8">
                      {/* Trading Type */}
                      <div>
                        <div className="mb-2 block text-sm font-semibold text-slate-700">
                          Trading Type <span className="text-red-500">*</span>
                        </div>
                        <div className="flex gap-4">{tradingTypeOptions}</div>
                      </div>

                      {/* Pay from */}
                      <div>
                        <label
                          htmlFor="payFrom"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Pay from <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="payFrom"
                            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          >
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
                          <label
                            htmlFor="invoiceIssueDate"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
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
                          <label
                            htmlFor="payingDate"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
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
                        <label className="flex cursor-pointer items-center gap-2 pb-3.5">
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
                        <label
                          htmlFor="payingReason"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
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
                        <label
                          htmlFor="amount"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
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
                        <label
                          htmlFor="note"
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Note
                        </label>
                        <input
                          id="note"
                          type="text"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider and Journal List */}
                  <JournalList />

                  {/* Save Button */}
                  <div className="flex flex-1 items-end justify-end px-8 pb-8">
                    <button className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffb732] px-10 py-3 font-bold text-slate-800 shadow-sm transition-colors hover:bg-[#ffaa1a] lg:w-auto">
                      Save <Save size={18} />
                    </button>
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
