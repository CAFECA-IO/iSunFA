"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Upload,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { timestampToString, numberWithCommas } from "@/lib/utils/common";
import VoucherDetailModal from "@/components/user/voucher/voucher_detail_modal";
import { IVoucher, TradingType, mockVouchers } from "@/interfaces/voucher";

const VoucherRow = ({
  voucher,
  onClick,
}: {
  voucher: IVoucher;
  onClick: () => void;
}) => {
  const lineItems = voucher.lineItems.lines;

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
        return "bg-red-200 text-red-500";
      case TradingType.INCOME:
        return "bg-emerald-200 text-emerald-600";
      case TradingType.TRANSFER:
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getPillLabel = (v: IVoucher) => {
    if (v.tradingType === TradingType.TRANSFER) return "Transfer";
    return v.id;
  };

  return (
    <tr
      key={voucher.id}
      onClick={onClick}
      className="cursor-pointer transition-colors last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
    >
      <td className="px-3 py-4 align-middle text-xs sm:px-6 sm:text-sm">
        <div className="font-bold">
          {timestampToString(voucher.tradingDate).dateAndTime}
        </div>
      </td>
      <td className="px-3 py-4 align-middle sm:px-6">
        <span
          className={`flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap sm:text-sm ${getTypeClasses(voucher.tradingType)}`}
        >
          {renderIcon(voucher.tradingType)} {getPillLabel(voucher)}
        </span>
        {voucher.isDeleted && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-500">
              Deleted
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-4 align-middle text-xs font-bold text-slate-700 sm:px-6 sm:text-sm">
        <div className="line-clamp-3">{voucher.note || "-"}</div>
      </td>
      <td aria-label="Accounting" className="px-3 py-4 align-top sm:px-6">
        <div className="flex flex-col gap-2 text-xs font-semibold text-slate-700">
          {lineItems.map((line) => (
            <div key={line.id} className="flex items-center gap-2">
              <span className="text-slate-400">{line.accounting.code}</span>
              <span>{line.accounting.name}</span>
            </div>
          ))}
        </div>
      </td>
      <td
        aria-label="Debit"
        className="py-4 pl-3 text-right align-top text-xs font-bold text-slate-600 sm:pl-6"
      >
        <div className="flex flex-col items-end gap-2 border-b border-slate-300 px-2 pb-2">
          {lineItems.map((line) => (
            <div
              key={line.id}
              className={`flex items-center gap-2 text-right ${line.isDebit ? "text-slate-600" : "text-slate-300"}`}
            >
              <span>{line.isDebit ? numberWithCommas(line.amount) : 0}</span>
            </div>
          ))}
        </div>
      </td>

      <td
        aria-label="Credit"
        className="py-4 pr-3 text-right align-top text-xs font-bold sm:pr-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-end gap-2 border-b border-slate-300 px-2 pb-2">
            {lineItems.map((line) => (
              <div
                key={line.id}
                className={`flex items-center gap-2 text-right ${line.isDebit ? "text-slate-300" : "text-slate-600"}`}
              >
                <span>{line.isDebit ? 0 : numberWithCommas(line.amount)}</span>
              </div>
            ))}
          </div>
          <div className="px-2 text-right">
            {numberWithCommas(voucher.lineItems.totalAmount)}
          </div>
        </div>
      </td>
      <td aria-label="Issuer" className="px-3 py-4 align-middle sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {voucher.issuerName.substring(0, 2).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-slate-700">
            {voucher.issuerName}
          </span>
        </div>
      </td>
    </tr>
  );
};

export default function VoucherMainView() {
  const pathname = usePathname();

  const currencyUnit = "TWD"; // ToDo: (20260310 - Julian) 先固定使用 TWD

  const [filteredType, setFilteredType] = useState<TradingType | "all">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );
  const [vouchers /* , setVouchers */] = useState<IVoucher[]>(mockVouchers);
  const [hideDeleted, setHideDeleted] = useState<boolean>(false);

  // Info: (20260309 - Julian) 連接到 Journal
  const journalLink = pathname.replace("voucher", "journal");

  const displayedVoucher =
    vouchers.length > 0 ? (
      vouchers.map((v) => (
        <VoucherRow
          key={v.id}
          voucher={v}
          onClick={() => {
            setSelectedVoucherId(v.id);
            setIsModalOpen(true);
          }}
        />
      ))
    ) : (
      <tr>
        <td colSpan={7} className="px-3 py-4 text-center sm:px-6">
          目前尚無傳票，請
          <Link href={journalLink} className="text-blue-600 hover:underline">
            在此上傳檔案
          </Link>
        </td>
      </tr>
    );

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <div className="flex justify-between px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">傳票管理</h1>
      </div>

      <div className="flex w-full flex-col gap-4 gap-x-12 px-0 sm:px-8 pb-10">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Info: (20260310 - Julian) Top Controls */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="typeSelect"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Type
              </label>
              <select
                id="typeSelect"
                value={filteredType}
                onChange={(e) =>
                  setFilteredType(e.target.value as TradingType | "all")
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
              >
                <option value="all">All</option>
                <option value={TradingType.INCOME}>Payment</option>
                <option value={TradingType.OUTCOME}>Receipt</option>
                <option value={TradingType.TRANSFER}>Transfer</option>
              </select>
            </div>
            <div className="flex-[1.5]">
              <div className="mb-2 block text-xs font-semibold text-slate-700">
                Period
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Start Date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[10.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                <span className="text-slate-400">-</span>
                <input
                  aria-label="End Date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-[14px] py-[10.5px] text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-2">
              <label
                htmlFor="searchField"
                className="mb-2 block text-xs font-semibold text-transparent select-none"
              >
                Search
              </label>
              <div className="relative">
                <input
                  id="searchField"
                  aria-label="Search"
                  type="text"
                  placeholder="Search"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                />
                <Search
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                id="hideDeletedToggle"
                aria-label="Toggle hide deleted vouchers"
                onClick={(e) => {
                  e.preventDefault();
                  setHideDeleted(!hideDeleted);
                }}
                className={`relative h-6 w-11 rounded-full transition-colors ${hideDeleted ? "bg-orange-500" : "bg-slate-200"}`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${hideDeleted ? "translate-x-5.5" : "translate-x-0.5"}`}
                />
              </button>
              <label
                htmlFor="hideDeletedToggle"
                className="cursor-pointer text-sm font-semibold text-slate-600"
              >
                Hide deleted vouchers and their reversals.
              </label>
            </div>
            {/* <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Download size={16} /> Export Voucher
              </button>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">
                Select
              </button>
            </div> */}
          </div>

          <div className="mb-2 text-right text-xs uppercase font-bold tracking-wider text-slate-400">
            CURRENCY: {currencyUnit}
          </div>

          {/* Info: (20260310 - Julian) Table Container */}
          <div className="overflow-x-auto max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <tbody>
                <tr>
                  <th className="w-[120px] bg-slate-100 px-3 py-4 text-left text-xs text-slate-700 sm:w-[180px] sm:px-6 sm:text-base">
                    <button type="button" className="flex items-center gap-1">
                      Issued Date
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    Voucher No.
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    Note
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    Accounting
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    <button
                      type="button"
                      className="mx-auto flex items-center justify-center gap-1"
                    >
                      Debit
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    <button
                      type="button"
                      className="mx-auto flex items-center justify-center gap-1"
                    >
                      Credit
                      <div className="-gap-[2px] flex shrink-0 flex-col px-2">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </button>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs text-slate-700 sm:px-6 sm:text-base">
                    Issuer
                  </th>
                </tr>
                {displayedVoucher}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <VoucherDetailModal
        key={selectedVoucherId || "new"}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        voucherId={selectedVoucherId?.toString()??''}
      />
    </div>
  );
}
