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
  Calendar,
  Search,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import VoucherDetailModal from "@/components/user/voucher/voucher_detail_modal";
import { IVoucher, TradingType, mockVouchers } from "@/interfaces/voucher";

const VoucherRow = ({
  voucher,
  onClick,
}: {
  voucher: IVoucher;
  onClick: () => void;
}) => {
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
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getPillLabel = (v: IVoucher) => {
    if (v.tradingType === TradingType.TRANSFER) return "Transfer";
    if (v.tradingType === TradingType.INCOME && v.hasRead === false)
      return "Income";
    return "240201-001";
  };

  // Mock double entry accounting lines
  const line1Credit =
    voucher.tradingType === TradingType.OUTCOME ? voucher.amount : "0";
  const line1Debit =
    voucher.tradingType !== TradingType.OUTCOME ? voucher.amount : "0";

  const line2Credit =
    voucher.tradingType !== TradingType.OUTCOME ? voucher.amount : "0";
  const line2Debit =
    voucher.tradingType === TradingType.OUTCOME ? voucher.amount : "0";

  return (
    <tr
      key={voucher.id}
      onClick={onClick}
      className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 odd:bg-slate-50 even:bg-white hover:bg-orange-100"
    >
      <td className="px-3 py-4 align-top text-xs sm:px-6">
        <div className="font-bold">
          {timestampToString(voucher.tradingDate).dateAndTime}
        </div>
      </td>
      <td className="px-3 py-4 align-top sm:px-6">
        <span
          className={`flex items-center justify-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap ${getTypeClasses(voucher.tradingType)}`}
        >
          {renderIcon(voucher.tradingType)} {getPillLabel(voucher)}
        </span>
        {!voucher.hasRead && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-600">
              Deleted
            </span>
          </div>
        )}
      </td>
      <td className="px-3 py-4 align-top text-xs font-bold text-slate-700 sm:px-6">
        {voucher.note || "Printer-0001"}
      </td>
      <td aria-label="Accounting" className="px-3 py-4 align-top sm:px-6">
        <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{voucher.sourceId}</span>
            <span>{voucher.sourceName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{voucher.reasonId}</span>
            <span>{voucher.reasonName}</span>
          </div>
        </div>
      </td>
      <td aria-label="Credit" className="pl-3 py-4 align-top text-right text-xs font-bold text-slate-600 sm:pl-6">
        <div className="flex flex-col gap-2">
          <div>{line1Credit}</div>
          <div>{line2Credit}</div>
          <div className="mt-2 border-t border-slate-200 pt-2 text-slate-700">
            {voucher.amount}
          </div>
        </div>
      </td>
      <td aria-label="Debit" className="pr-3 py-4 align-top text-right text-xs font-bold text-slate-600 sm:pr-6">
        <div className="flex flex-col gap-2">
          <div>{line1Debit}</div>
          <div>{line2Debit}</div>
          <div className="mt-2 border-t border-slate-200 pt-2 text-slate-700">
            {voucher.amount}
          </div>
        </div>
      </td>
      <td aria-label="Issuer" className="px-3 py-4 align-top sm:px-6">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            JD
          </div>
          <span className="text-xs font-bold text-slate-700">Jodie</span>
        </div>
      </td>
    </tr>
  );
};

export default function VoucherMainView() {
  const pathname = usePathname();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(
    null,
  );
  const [vouchers /* , setVouchers */] = useState<IVoucher[]>(mockVouchers);
  const [hideDeleted, setHideDeleted] = useState(false);

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

      <div className="flex w-full flex-col gap-4 px-8 pb-10 gap-x-12">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Top Controls */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="typeSelect"
                className="mb-2 block text-xs font-semibold text-slate-500"
              >
                Type
              </label>
              <select
                id="typeSelect"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option>All</option>
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="periodInput"
                className="mb-2 block text-xs font-semibold text-slate-500"
              >
                Period
              </label>
              <div className="relative">
                <input
                  id="periodInput"
                  aria-label="Period"
                  type="text"
                  placeholder="Start Date - End Date"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <Calendar
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
              </div>
            </div>
            <div className="flex-2">
              <label
                htmlFor="searchField"
                className="mb-2 block text-xs font-semibold select-none text-transparent"
              >
                Search
              </label>
              <div className="relative">
                <input
                  id="searchField"
                  aria-label="Search"
                  type="text"
                  placeholder="Search"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <Search
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
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
              <label htmlFor="hideDeletedToggle" className="text-sm font-semibold text-slate-600 cursor-pointer">
                Hide deleted vouchers and their reversals.
              </label>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Download size={16} /> Export Voucher
              </button>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">
                Select
              </button>
            </div>
          </div>

          <div className="mb-2 text-right text-xs font-bold tracking-wider text-slate-400">
            CURRENCY: TWD
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-gray-600">
              <tbody>
                <tr>
                  <th className="w-[120px] bg-slate-100 px-3 py-4 text-left text-xs font-bold text-slate-400 sm:px-6">
                    <div className="flex items-center gap-1">
                      Issued Date
                      <div className="-gap-[2px] flex scale-75 flex-col opacity-80">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </div>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs font-bold text-slate-400 sm:px-6">
                    Voucher No.
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs font-bold text-slate-400 sm:px-6">
                    Note
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs font-bold text-slate-400 sm:px-6">
                    Accounting
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-right text-xs font-bold text-slate-400 sm:px-6">
                    <div className="flex items-center justify-end gap-1">
                      Credit
                      <div className="-gap-[2px] flex scale-75 flex-col opacity-60">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </div>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-right text-xs font-bold text-slate-400 sm:px-6">
                    <div className="flex items-center justify-end gap-1">
                      Debit
                      <div className="-gap-[2px] flex scale-75 flex-col opacity-60">
                        <ChevronUp size={14} className="translate-y-[2px]" />
                        <ChevronDown size={14} className="-translate-y-[2px]" />
                      </div>
                    </div>
                  </th>
                  <th className="bg-slate-100 px-3 py-4 text-center text-xs font-bold text-slate-400 sm:px-6">
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
        voucherId={selectedVoucherId?.toString()}
        voucher={vouchers.find((v) => v.id === selectedVoucherId)}
      />
    </div>
  );
}
